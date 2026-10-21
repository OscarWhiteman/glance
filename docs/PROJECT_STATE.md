# Glance — Project State

_Last updated: 2026-04-03_

---

## Architecture

```
glance/                         ← npm workspaces root
├── packages/shared/            ← @glance/shared  (CJS, no "type":"module")
├── packages/electron/          ← Desktop app
│   ├── src/                    ← Main process (TypeScript → CJS via tsc)
│   ├── renderer/               ← React UI (TypeScript → browser bundle via Vite)
│   └── ui/                     ← Vite build output (loaded by Electron via file://)
└── packages/extension/         ← Chrome MV3 extension (Vite IIFE builds)
```

### Communication

| Channel | Purpose |
|---------|---------|
| `globalShortcut` ⌘⇧G | Triggers capture flow |
| `ipcMain` / `ipcRenderer` | Renderer ↔ Main (typed channels in preload.ts) |
| `ws://localhost:43210` | Extension → Electron (`TEXT_REQUEST` / `ACK`) |

---

## Fully Functional Features

### Capture Pipeline
- **Hotkey** `⌘⇧G` triggers `startCapture()`
- **Screen Recording permission check** (`systemPreferences.getMediaAccessStatus('screen')`)
- **Full-screen capture** via `desktopCapturer.getSources()` at native HiDPI resolution
- **Drag-to-select overlay** (`ui/overlay.html`) — transparent fullscreen window, crosshair, region highlight
- **HiDPI-aware crop** — multiplies coordinates by `scaleFactor`; resize if >1280px logical
- **JPEG compression** at 85% quality (vs raw PNG) — typically 3-5× smaller for screenshots
- **Configurable capture delay** (`settings.captureDelay`, default 200ms) to ensure the floating window is composited away before capture

### Action Picker
- Appears at cursor position after region selection
- Four actions: **Debug** (D), **Explain** (E), **⚡ Convert to Code** (K), **Custom…** (C)
- Keyboard shortcuts, ESC to cancel, blur-to-close
- Custom prompt mode with text input and Enter-to-submit

### AI Streaming
- `queryStream()` async generator on all 3 providers (OpenAI, Anthropic, Gemini)
- Main process iterates `.next()` loop, forwards tokens via `glance:stream-token` IPC
- `AbortController` cancels the in-flight stream when a new capture starts
- Last query cached as `lastQuery` for retry
- **Retry button** appears in the error state

### Floating Window UI
- Frameless, `vibrancy: 'under-window'` (macOS glass), always-on-top
- **Smart positioning**: placed right of the capture region; flips left if it overflows screen edge; Y-clamped
- **Pin/Unpin toggle** (📌) — calls `set-always-on-top` IPC
- **Connection status dot** — tests API key on click; green/yellow/red
- **Streaming cursor blink** during active stream
- **Three main tabs**: Result · History · Logs

### Result View
- `react-markdown` + `remark-gfm` renders the response
- Custom `CodeBlock` component — language label + **Copy** button (Clipboard API)
- **⚡ Preview sub-tab** — automatically appears when response contains a ` ```html ` block
  - Renders in a sandboxed `<iframe srcdoc>` with:
    - `sandbox="allow-scripts"` (no `allow-same-origin`) → **null origin**, cannot access Electron APIs
    - `referrerPolicy="no-referrer"` → doesn't leak `file://` to Tailwind CDN
    - Injected strict CSP: `connect-src 'none'`, scripts from `cdn.tailwindcss.com` only
- Metadata footer: provider · model · duration

### History
- Stored at `{userData}/history.json`, max 50 entries (FIFO)
- History tab: expandable cards with emoji source indicator (📷 hotkey / 🌐 extension)
- "Load in viewer" restores a past result to the Result tab
- "Clear history" button

### Debug Logs
- In-memory ring buffer (200 entries) via `logger.ts`
- All key events logged: capture, streams, WS connections, permission checks, compression stats
- Logs tab: timestamped, colour-coded INFO/WARN/ERR, live auto-refresh checkbox

### Chrome Extension
- **MV3** manifest; `background.js` (service worker) + `content.js` (injected)
- Context menu "Send to Glance" on any element or selection
- Background opens WebSocket to `ws://localhost:43210`, sends `TEXT_REQUEST`, shows badge feedback (`…` / `✓` / `✗`)
- Content script captures: selected text → right-clicked element text+stripped HTML → body fallback
- Built with Vite IIFE lib mode (`BUILD_TARGET=background|content`)
- Load unpacked from `packages/extension/dist/`

### Text-only AI Queries (Extension path)
- `AIRequestOptions.imageBase64` is optional — providers branch on its presence
- `textContent` field embeds web content into the prompt when no image is available
- All three providers handle both image+text and text-only queries

---

## Pending / Incomplete

### Step 7 — Mostly done
- ✅ "Convert to Code" action (prompt + ACTION_PROMPTS entry)
- ✅ Preview tab (sandboxed iframe, CSP injection, HTML extraction)
- ✅ Auto-update infrastructure (electron-updater, IPC, update banner UI)
- ✅ Image compression (JPEG 85%, max 1280px)
- ✅ Retry button
- ✅ Debug Logs view
- ✅ **Settings UI** — full settings panel (provider selector, per-provider API keys, model override, launch-at-login toggle, capture delay slider, hotkey display, about section)
- ✅ **Onboarding / first-run** — 3-step wizard (provider + API key → hotkey info → screen recording permission); shown when no API key is configured
- ✅ **Tray icon** — programmatic 44×44 @2x "G" eye template image via `createTrayIcon()` in `trayIcon.ts`
- ✅ **Crash logging** — `crashLog.ts` writes uncaught exceptions/rejections to `{userData}/crash.log` with 512 KB rotation
- ✅ **Error boundary** — `ErrorBoundary.tsx` catches renderer crashes
- ⬜ **Real update feed** — `electron-builder` publish config points to placeholder `glance-app/glance` GitHub repo
- ⬜ **App icons** — no `.icns`/`.ico` for the packaged app (Dock/taskbar)
- ⬜ **Extension icons** — `icons/` directory referenced in manifest but not created
- ⬜ **Code signing** — `entitlements.mac.plist` in place; needs actual Apple Developer identity

---

## Environment Quirks Solved

| Issue | Solution |
|-------|---------|
| **HiDPI / Retina crop** | Multiply all crop coordinates by `screen.getPrimaryDisplay().scaleFactor`; capture thumbnail at `width * scale` × `height * scale` |
| **Capture delay** | `floatingWindow.hide()` + `setTimeout(captureDelay)` before `desktopCapturer`; configurable via `settings.captureDelay` (default 200ms) |
| **@glance/shared CJS** | Removed `"type":"module"` from shared `package.json`; changed shared `tsconfig.json` to `"module":"CommonJS"`. Renderer uses Vite alias (`'@glance/shared'` → source files) so it never touches the dist. |
| **Tailwind in Electron renderer** | Config files must use `.cjs` extension (`tailwind.config.cjs`, `postcss.config.cjs`) since the electron package has no `"type":"module"`. Content paths use `__dirname` (CJS). |
| **Vite multi-entry HTML output** | Must set `root: path.resolve(__dirname)` in `vite.config.ts` so HTML files output to the top of `outDir` rather than a subdirectory. |
| **Vite `base: './'`** | Required for `file://` protocol. Without it, Vite emits absolute `/assets/…` paths which 404 in Electron. |
| **Shared tsconfig `composite: true`** | Required so `packages/electron/tsconfig.json` can reference it via `"references"`. |
| **auto-updater in dev** | Guarded with `if (app.isPackaged)` — `electron-updater` throws when run outside a packaged app. |
| **WS port 43210** | Fixed port; the Chrome extension needs to know it at build time (hardcoded). Change `wsPort` in `GlanceSettings` and rebuild both if you change it. |
| **Anthropic `media_type` literal** | SDK requires `"image/png" | "image/jpeg" | "image/gif" | "image/webp"`, not `string`. Requires explicit cast in `AnthropicProvider.buildContent()`. |
| **Sandboxed iframe CSP** | AI-generated HTML rendered with `sandbox="allow-scripts"` (no `allow-same-origin`) + injected `Content-Security-Policy` meta tag. `connect-src 'none'` prevents phone-home; null origin prevents Electron API access. |

---

## Build Commands

```bash
# One-time setup
export PATH="/opt/homebrew/bin:$PATH"   # Node.js via Homebrew
npm install

# Build everything
npx tsc -p packages/shared/tsconfig.json
npx tsc -p packages/electron/tsconfig.json
npx vite build --config packages/electron/renderer/vite.config.ts

# Run in dev
cd packages/electron && npx electron .

# Build Chrome extension
cd packages/extension
BUILD_TARGET=background npx vite build && BUILD_TARGET=content npx vite build && cp manifest.json dist/
# Load dist/ folder in chrome://extensions → Load unpacked
```

---

## Key File Map

```
packages/shared/src/
  types.ts             ActionType, AIRequestOptions, HistoryEntry, GlanceSettings
  providers/base.ts    AIProvider abstract class (query + queryStream)
  providers/*.ts       OpenAI, Anthropic, Gemini implementations

packages/electron/src/
  main.ts              App entry, hotkey, tray, IPC handlers, capture flow
  capture.ts           desktopCapturer + HiDPI crop + JPEG compression
  overlayWindow.ts     Fullscreen transparent selection window
  actionPickerWindow.ts Small popup at cursor (Debug/Explain/Code/Custom)
  wsServer.ts          ws://localhost:43210, emits wsEvents for TEXT_REQUEST
  permissions.ts       macOS screen recording check + open System Settings
  settings.ts          Read/write {userData}/settings.json
  history.ts           Read/write {userData}/history.json (50-entry FIFO)
  logger.ts            In-memory ring buffer, 200 entries
  crashLog.ts          Writes uncaught exceptions to {userData}/crash.log (512 KB rotate)
  trayIcon.ts          Programmatic 44×44 @2x "G" eye tray icon (macOS template image)
  preload.ts           contextBridge for renderer (streaming + history + retry + logs + settings)
  preload-overlay.ts   contextBridge for overlay window
  preload-picker.ts    contextBridge for action picker window

packages/electron/renderer/src/
  App.tsx              Main shell: header, tabs (Result/History/Logs), update banner
  hooks/useStreaming.ts State machine: idle → streaming → done|error|permissions
  hooks/useHistory.ts  Load/clear history via IPC
  components/
    ResultView.tsx     Markdown + Preview tab (sandboxed iframe)
    CodeBlock.tsx      Syntax-highlighted code with Copy button
    ActionPicker.tsx   4-button picker (rendered in picker.html)
    HistoryView.tsx    Scrollable history cards
    LogsView.tsx       Timestamped debug logs with live refresh
    SettingsView.tsx    Full settings panel (provider, keys, model, preferences)
    OnboardingView.tsx  3-step first-run wizard (provider/key → hotkey → permissions)
    ErrorBoundary.tsx   Catches renderer crashes gracefully
    PermissionsGuard.tsx  macOS screen recording instructions

packages/extension/src/
  background.ts        Service worker: context menu, WebSocket bridge, badge
  content.ts           Content script: capture element/selection on demand
```
