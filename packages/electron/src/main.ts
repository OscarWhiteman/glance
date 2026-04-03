import {
  app, BrowserWindow, globalShortcut, ipcMain,
  screen, Tray, Menu,
} from 'electron';
import * as path from 'path';
import { autoUpdater } from 'electron-updater';
import { startWebSocketServer, stopWebSocketServer, wsEvents, getActivePort } from './wsServer';
import type { TextRequest } from './wsServer';
import { captureFullScreen, cropToRegion } from './capture';
import type { CaptureRegion } from './capture';
import { openSelectionOverlay } from './overlayWindow';
import { openActionPicker } from './actionPickerWindow';
import { hasScreenCapturePermission, openScreenCaptureSettings } from './permissions';
import { loadSettings, saveSettings } from './settings';
import { loadHistory, saveEntry, clearHistory } from './history';
import { log, getLogs } from './logger';
import { createTrayIcon } from './trayIcon';
import { setupCrashLogging } from './crashLog';
import { createProvider, ACTION_PROMPTS } from '@glance/shared';
import type { AIResponse, ActionType, HistoryEntry, QuerySource } from '@glance/shared';

let floatingWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let capturing = false;
let isQuitting = false;

// Abort the in-flight stream when a new query starts
let activeAbort: AbortController | null = null;

// Cache last query so the user can retry on failure
interface QueryCache {
  imageBase64?: string;
  imageMimeType?: 'image/jpeg';
  textContent?: string;
  prompt: string;
  source: QuerySource;
  region?: CaptureRegion;
}
let lastQuery: QueryCache | null = null;

const HOTKEY = 'CommandOrControl+Shift+G';

// ── Floating result window ────────────────────────────────────────────────────

function getOrCreateFloatingWindow(): BrowserWindow {
  if (floatingWindow && !floatingWindow.isDestroyed()) return floatingWindow;

  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  floatingWindow = new BrowserWindow({
    width: 480,
    height: 600,
    x: sw - 500,
    y: sh - 640,
    frame: false,
    backgroundColor: '#1a1a2e',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // webviewTag intentionally false — preview uses sandboxed iframe, not webview
    },
  });

  floatingWindow.loadFile(path.join(__dirname, '../ui/index.html'));

  // Close hides the window — app keeps running in tray
  floatingWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      floatingWindow!.hide();
    }
  });

  return floatingWindow;
}

function positionWindowNearRegion(region: CaptureRegion): void {
  const win = getOrCreateFloatingWindow();
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const WIN_W = 480, WIN_H = 600, MARGIN = 16;

  let x = region.x + region.width + MARGIN;
  let y = region.y;

  if (x + WIN_W > sw) x = region.x - WIN_W - MARGIN;
  if (x < 0) x = sw - WIN_W - MARGIN;
  if (y + WIN_H > sh) y = sh - WIN_H - MARGIN;
  if (y < 0) y = MARGIN;

  win.setBounds({ x: Math.round(x), y: Math.round(y), width: WIN_W, height: WIN_H });
}

function showFloatingWindow(region?: CaptureRegion): void {
  const win = getOrCreateFloatingWindow();
  if (region) positionWindowNearRegion(region);
  win.show();
  win.focus();
}

function sendToRenderer(channel: string, payload?: unknown): void {
  const win = getOrCreateFloatingWindow();
  if (!win.isDestroyed()) win.webContents.send(channel, payload);
}

// ── AI streaming ──────────────────────────────────────────────────────────────

async function runAIQuery(query: QueryCache): Promise<void> {
  // Cancel any previous in-flight stream
  activeAbort?.abort();
  activeAbort = new AbortController();
  const { signal } = activeAbort;

  // Cache so the user can retry
  lastQuery = query;

  showFloatingWindow(query.region);
  sendToRenderer('glance:stream-start');

  const settings = loadSettings();
  if (!settings.provider.apiKey) {
    const msg = 'No API key configured. Add your key to settings.json in the app data directory.';
    log('warn', 'No API key set');
    sendToRenderer('glance:status', { type: 'error', text: msg });
    return;
  }

  log('info', `Starting AI query (${settings.provider.provider})`, query.prompt.slice(0, 80));
  const provider = createProvider(settings.provider);

  try {
    const gen = provider.queryStream({
      imageBase64: query.imageBase64,
      imageMimeType: query.imageMimeType,
      textContent: query.textContent,
      prompt: query.prompt,
      signal,
    });

    let next = await gen.next();
    while (!next.done) {
      if (signal.aborted) { await gen.return(undefined as never); break; }
      sendToRenderer('glance:stream-token', { token: next.value });
      next = await gen.next();
    }

    if (!signal.aborted) {
      const result = next.value as AIResponse;
      sendToRenderer('glance:stream-done', result);
      log('info', `Stream complete (${result.durationMs}ms, ${result.model})`);

      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        prompt: query.prompt,
        responseText: result.text,
        provider: result.provider,
        model: result.model,
        durationMs: result.durationMs,
        source: query.source,
      };
      saveEntry(entry);
    }
  } catch (err) {
    if (!signal.aborted) {
      const msg = (err as Error).message;
      log('error', 'AI stream failed', msg);
      sendToRenderer('glance:stream-error', { message: msg });
    }
  }
}

// ── Capture flow ──────────────────────────────────────────────────────────────

async function startCapture(): Promise<void> {
  if (capturing) return;
  capturing = true;

  if (!hasScreenCapturePermission()) {
    capturing = false;
    log('warn', 'Screen recording permission not granted');
    showFloatingWindow();
    sendToRenderer('glance:status', { type: 'permissions' });
    return;
  }

  floatingWindow?.hide();
  const settings = loadSettings();
  await new Promise<void>((r) => setTimeout(r, settings.captureDelay));

  let screenshot;
  try {
    screenshot = await captureFullScreen();
    log('info', 'Full-screen capture successful');
  } catch (err) {
    capturing = false;
    const msg = `Capture failed: ${(err as Error).message}`;
    log('error', 'Capture failed', (err as Error).message);
    showFloatingWindow();
    sendToRenderer('glance:status', { type: 'error', text: msg });
    return;
  }

  const dataUrl = screenshot.toDataURL();

  openSelectionOverlay(
    dataUrl,
    (region) => {
      capturing = false;
      const cursorPos = screen.getCursorScreenPoint();
      const { base64: imageBase64, mimeType: imageMimeType } = cropToRegion(screenshot, region);

      openActionPicker(
        cursorPos,
        (action: ActionType, customPrompt?: string) => {
          const prompt = action === 'custom'
            ? (customPrompt ?? settings.defaultPrompt)
            : ACTION_PROMPTS[action];
          void runAIQuery({ imageBase64, imageMimeType, prompt, source: 'hotkey', region });
        },
        () => { log('info', 'Action picker cancelled'); },
      );
    },
    () => {
      capturing = false;
      log('info', 'Region selection cancelled');
    },
  );
}

// ── Extension WebSocket requests ──────────────────────────────────────────────

wsEvents.on('text-request', (req: TextRequest) => {
  log('info', 'Extension text request received', req.url);
  void runAIQuery({
    textContent: req.text || req.html,
    prompt: req.prompt,
    source: 'extension',
  });
});

// ── Tray ──────────────────────────────────────────────────────────────────────

function toggleFloatingWindow(): void {
  const win = getOrCreateFloatingWindow();
  if (win.isVisible()) {
    win.hide();
  } else {
    showFloatingWindow();
  }
}

function createTray(): void {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Glance');
  const menu = Menu.buildFromTemplate([
    { label: 'Show / Hide', click: () => toggleFloatingWindow() },
    { label: `Capture (${HOTKEY})`, click: () => void startCapture() },
    { type: 'separator' },
    { label: 'Settings', click: () => { showFloatingWindow(); sendToRenderer('glance:show-settings'); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);
  // Single click toggles the window; right-click opens context menu (default)
  tray.on('click', () => toggleFloatingWindow());
}

// ── Auto-updater ──────────────────────────────────────────────────────────────

const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // every 4 hours

function setupAutoUpdater(): void {
  autoUpdater.logger = null; // use our own logger instead
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => log('info', 'Checking for updates…'));
  autoUpdater.on('update-available', (info: { version: string }) => {
    log('info', `Update available: v${info.version} — downloading…`);
    sendToRenderer('glance:status', {
      type: 'update-downloading',
      text: `Downloading v${info.version}…`,
    });
  });
  autoUpdater.on('update-not-available', () => log('info', 'Already on latest version'));
  autoUpdater.on('error', (err: Error) => log('error', 'Auto-updater error', err.message));
  autoUpdater.on('download-progress', (p: { percent: number }) =>
    log('info', `Downloading update: ${Math.round(p.percent)}%`));
  autoUpdater.on('update-downloaded', (info: { version: string }) => {
    log('info', `Update downloaded: v${info.version}`);
    sendToRenderer('glance:status', {
      type: 'update-ready',
      text: `v${info.version} downloaded. Restart to apply.`,
    });
  });

  // Check immediately on launch, then periodically
  void autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => {
    void autoUpdater.checkForUpdates().catch(() => {});
  }, UPDATE_CHECK_INTERVAL_MS);
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

// Electron derives userData from package.json "name" (@glance/electron).
// Override so the path is ~/Library/Application Support/Glance/ (matching productName).
app.setName('Glance');

app.whenReady().then(() => {
  setupCrashLogging();
  log('info', `Glance starting (Electron ${process.versions.electron})`);

  if (process.platform === 'darwin') app.dock?.hide();

  createTray();
  // Auto-updater only works in a packaged app — skip in dev mode
  if (app.isPackaged) setupAutoUpdater();

  const registered = globalShortcut.register(HOTKEY, () => void startCapture());
  if (!registered) {
    log('error', `Failed to register hotkey ${HOTKEY} — likely in use by another app`);
    // Show the window with a conflict warning so the user isn't left wondering
    showFloatingWindow();
    // Small delay to ensure the renderer is loaded before sending
    setTimeout(() => {
      sendToRenderer('glance:status', {
        type: 'hotkey-conflict',
        text: `Hotkey ${HOTKEY.replace('CommandOrControl', process.platform === 'darwin' ? 'Cmd' : 'Ctrl')} is already in use by another app. Capture won't work until the conflict is resolved.`,
      });
    }, 1500);
  }

  const settings = loadSettings();
  startWebSocketServer(settings.wsPort).then((port) => {
    log('info', `WebSocket server on port ${port}`);
  }).catch((err) => {
    log('error', 'WebSocket server failed to start', (err as Error).message);
  });

  // Show the window on launch so the app feels alive.
  // On first run (no API key) it shows onboarding; otherwise the result view.
  showFloatingWindow();

  // Window controls
  ipcMain.on('hide-window', () => floatingWindow?.hide());
  ipcMain.on('set-always-on-top', (_e, flag: boolean) => {
    floatingWindow?.setAlwaysOnTop(flag, flag ? 'screen-saver' : undefined);
  });
  ipcMain.on('open-settings', () => openScreenCaptureSettings());
  ipcMain.handle('recheck-permissions', () => {
    const granted = hasScreenCapturePermission();
    log('info', `Permission recheck: ${granted ? 'granted' : 'denied'}`);
    return granted;
  });
  ipcMain.on('relaunch-app', () => {
    app.relaunch();
    app.exit(0);
  });

  // History
  ipcMain.handle('get-history', () => loadHistory());
  ipcMain.handle('clear-history', () => { clearHistory(); return undefined; });

  // Settings
  ipcMain.handle('get-settings', () => loadSettings());
  ipcMain.handle('save-settings', (_e, settings: import('@glance/shared').GlanceSettings) => {
    saveSettings(settings);
    // Apply launch-at-login immediately
    app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
    log('info', 'Settings saved', `provider=${settings.provider.provider}`);
    return true;
  });

  // Retry last failed query
  ipcMain.handle('retry-query', () => {
    if (!lastQuery) return;
    void runAIQuery(lastQuery);
  });

  // App info
  ipcMain.handle('get-app-info', () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    platform: process.platform,
  }));

  // Debug logs
  ipcMain.handle('get-logs', () => getLogs());

  // Connection test
  ipcMain.handle('check-connection', async () => {
    const settings = loadSettings();
    if (!settings.provider.apiKey) return { ok: false, message: 'No API key configured' };
    try {
      const provider = createProvider(settings.provider);
      await provider.query({ prompt: 'Reply OK.', maxTokens: 5 });
      log('info', `Connection check passed (${settings.provider.provider})`);
      return { ok: true };
    } catch (err) {
      log('warn', 'Connection check failed', (err as Error).message);
      return { ok: false, message: (err as Error).message };
    }
  });

  // Auto-update (packaged only)
  ipcMain.handle('check-for-updates', async () => {
    if (!app.isPackaged) return { available: false, error: 'Not available in development mode' };
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        available: !!result?.updateInfo,
        version: result?.updateInfo?.version ?? null,
      };
    } catch (err) {
      return { available: false, error: (err as Error).message };
    }
  });
  ipcMain.handle('install-update', () => {
    if (app.isPackaged) autoUpdater.quitAndInstall();
  });

  // Open external URL (for feedback link, etc.)
  ipcMain.handle('open-external', (_e, url: string) => {
    const { shell } = require('electron') as typeof import('electron');
    return shell.openExternal(url);
  });

  // Permission check for renderer
  ipcMain.handle('has-screen-recording', () => hasScreenCapturePermission());
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopWebSocketServer();
});

app.on('window-all-closed', () => { /* keep running in tray */ });
