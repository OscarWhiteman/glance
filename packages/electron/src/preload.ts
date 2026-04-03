import { contextBridge, ipcRenderer } from 'electron';
import type { AIResponse, HistoryEntry, GlanceSettings } from '@glance/shared';
import type { LogEntry } from './logger';

type RemoveFn = () => void;

function on<T>(channel: string, cb: (value: T) => void): RemoveFn {
  const handler = (_: Electron.IpcRendererEvent, value: T) => cb(value);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld('glance', {
  // Window controls
  hideWindow:     () => ipcRenderer.send('hide-window'),
  setAlwaysOnTop: (flag: boolean) => ipcRenderer.send('set-always-on-top', flag),
  openSettings:   () => ipcRenderer.send('open-settings'),
  recheckPermissions: (): Promise<boolean> => ipcRenderer.invoke('recheck-permissions'),
  relaunchApp:    () => ipcRenderer.send('relaunch-app'),

  // Navigation (from tray menu)
  onShowSettings: (cb: () => void): RemoveFn =>
    on('glance:show-settings', cb),

  // Streaming
  onStreamStart: (cb: () => void): RemoveFn =>
    on('glance:stream-start', cb),
  onStreamToken: (cb: (token: string) => void): RemoveFn =>
    on<{ token: string }>('glance:stream-token', ({ token }) => cb(token)),
  onStreamDone:  (cb: (result: AIResponse) => void): RemoveFn =>
    on('glance:stream-done', cb),
  onStreamError: (cb: (message: string) => void): RemoveFn =>
    on<{ message: string }>('glance:stream-error', ({ message }) => cb(message)),
  onStatus:      (cb: (status: { type: string; text?: string }) => void): RemoveFn =>
    on('glance:status', cb),

  // Settings
  getSettings:  (): Promise<GlanceSettings> => ipcRenderer.invoke('get-settings'),
  saveSettings: (s: GlanceSettings): Promise<boolean> => ipcRenderer.invoke('save-settings', s),

  // History
  getHistory:   (): Promise<HistoryEntry[]> => ipcRenderer.invoke('get-history'),
  clearHistory: (): Promise<void>           => ipcRenderer.invoke('clear-history'),

  // Retry
  retryQuery: (): Promise<void> => ipcRenderer.invoke('retry-query'),

  // Debug logs
  getLogs: (): Promise<LogEntry[]> => ipcRenderer.invoke('get-logs'),

  // App info
  getAppInfo: (): Promise<{ version: string; electron: string; platform: string }> =>
    ipcRenderer.invoke('get-app-info'),

  // Connection
  checkConnection: (): Promise<{ ok: boolean; message?: string }> =>
    ipcRenderer.invoke('check-connection'),

  // Updates
  checkForUpdates: (): Promise<{ available: boolean; version?: string | null; error?: string }> =>
    ipcRenderer.invoke('check-for-updates'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('install-update'),

  // External links
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),

  // Permissions
  hasScreenRecording: (): Promise<boolean> => ipcRenderer.invoke('has-screen-recording'),
});
