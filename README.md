# Glance

**Instant AI screen analysis for Windows, macOS, and Linux.**

Capture any part of your screen and get an AI-powered explanation, debug analysis, or code conversion in seconds. Glance lives in your system tray and works with a single keyboard shortcut.

## Download

**[Download Glance v1.1.0](https://github.com/OscarWhiteman/glance/releases/tag/v1.1.0)**

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `Glance-1.1.0-arm64.dmg` |
| Windows | `Glance-Setup-1.1.0.exe` |
| Linux | `Glance-1.1.0.AppImage` |

> Requires an API key from Anthropic, OpenAI, or Google Gemini. You'll be prompted to enter one on first launch.

---

## Screenshots

<!-- TODO: add screenshots to docs/screenshots/ -->

| Region selection | Action picker | Streaming result |
|------------------|---------------|------------------|
| ![Drag-to-select overlay](docs/screenshots/capture.png) | ![Action picker](docs/screenshots/action-picker.png) | ![Result window](docs/screenshots/result.png) |

| Code preview | Settings | Chrome extension |
|--------------|----------|------------------|
| ![Convert to Code preview](docs/screenshots/preview.png) | ![Settings panel](docs/screenshots/settings.png) | ![Send to Glance context menu](docs/screenshots/extension.png) |

---

## How It Works

1. **Press `Ctrl+Shift+G`** (or `Cmd+Shift+G` on macOS) from anywhere on your desktop
2. **Drag to select** the region of your screen you want to analyze
3. **Pick an action:**
   - **Debug** (D) — find issues in error messages, stack traces, or UI bugs
   - **Explain** (E) — get a plain-English explanation of what's on screen
   - **Convert to Code** (K) — turn a screenshot into HTML/CSS/React code
   - **Custom** (C) — write your own prompt
4. **Read the result** in a floating window that stays on top of your other apps

### Chrome Extension

Glance also includes a Chrome extension. Right-click any element or selected text on a webpage and choose **"Send to Glance"** to get instant AI analysis without taking a screenshot.

---

## Setup Instructions

### Requirements

- Windows 10/11, macOS (Apple Silicon or Intel), or Linux
- An API key from one of these providers:
  - [Anthropic](https://console.anthropic.com/) (default — uses Claude 3 Haiku)
  - [OpenAI](https://platform.openai.com/api-keys)
  - [Google Gemini](https://aistudio.google.com/app/apikey)

### Install on Windows

1. Download `Glance-Setup-1.1.0.exe` from the [Releases](../../releases) page
2. Run the installer — it will install and launch Glance automatically
3. Glance will appear in your system tray
4. Follow the onboarding wizard to enter your API key

### Install on macOS

1. Download `Glance-1.1.0-arm64.dmg` from the [Releases](../../releases) page
2. Open the DMG and drag **Glance** to your Applications folder
3. **Right-click > Open** the first time (the app is unsigned, so macOS will block a normal double-click)
4. Follow the onboarding wizard to enter your API key

### Install on Linux

1. Download `Glance-1.1.0.AppImage` from the [Releases](../../releases) page
2. Make it executable: `chmod +x Glance-1.1.0.AppImage`
3. Run it: `./Glance-1.1.0.AppImage`
4. Follow the onboarding wizard to enter your API key

### Chrome Extension (Optional)

1. Open `chrome://extensions` in Google Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `packages/extension/dist` folder
5. Right-click any webpage element and choose **"Send to Glance"**

---

## macOS Screen Recording Permission

> **macOS only — not required on Windows or Linux.**

When you first use the hotkey on macOS, the OS will ask you to grant Screen Recording permission. If it doesn't, or if captures appear blank:

1. Open **System Settings > Privacy & Security > Screen Recording**
2. Find **Glance** in the list and enable it
3. You may need to restart Glance for the change to take effect

---

## Architecture

Glance is a TypeScript monorepo built with npm workspaces and split into three packages:

- **`packages/shared`** (`@glance/shared`): the code both apps rely on. It holds the shared types (`AIRequestOptions`, `HistoryEntry`, `GlanceSettings`, …) and the AI provider layer. It has no Electron or browser dependencies.
- **`packages/electron`**: the desktop app. The **main process** (`src/`) handles the global hotkey, the tray, screen capture (HiDPI-aware crop and JPEG compression), settings and history. It also runs a local WebSocket server. The **renderer** (`renderer/`) is a React + Tailwind UI bundled with Vite, and it talks to the main process over typed IPC channels exposed through `contextBridge` preloads.
- **`packages/extension`**: a Chrome MV3 extension. Its content script collects the selected text or the right-clicked element. The background service worker then sends that content to the desktop app over `ws://localhost:43210`, so all AI calls and API keys stay in one place.

### Provider abstraction

Every AI backend extends one abstract class, `AIProvider` (`packages/shared/src/providers/base.ts`), which defines two methods:

- `query(options)`, which returns the full response
- `queryStream(options)`, an async generator that yields tokens as they arrive and returns the final `AIResponse`

`createProvider(config)` is a small factory that returns the right implementation for the user's settings. As a result, the rest of the app never imports a vendor SDK directly. Adding a provider means writing one class and adding one `case`. Each provider handles both image+text requests (screen captures) and text-only requests (from the extension).

| Provider | Default model (overridable in Settings) |
|----------|------------------------------------------|
| Anthropic | `claude-3-haiku-20240307` (app default provider) |
| OpenAI | `gpt-4o` |
| Google Gemini | `gemini-2.0-flash` |

For more implementation notes, see [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md).

---

## Development

```bash
# Install dependencies
npm install

# Build everything
npm run build --workspaces

# Run the Electron app in dev mode
npm run dev --workspace=packages/electron

# Build the Chrome extension
npm run build --workspace=packages/extension

# Package for distribution
npm run pack --workspace=packages/electron        # macOS DMG
npm run pack:win --workspace=packages/electron    # Windows NSIS installer
npm run pack:linux --workspace=packages/electron  # Linux AppImage
```

### Project Structure

```
packages/
  shared/       — TypeScript types + AI provider abstraction (OpenAI, Anthropic, Gemini)
  electron/     — Desktop app (Electron + React + Tailwind)
  extension/    — Chrome MV3 browser extension
```

---

## Troubleshooting

### macOS: "Glance can't be opened because Apple cannot check it for malicious software"

This is normal — the app isn't signed with an Apple Developer certificate yet. To bypass this:

1. **Don't double-click.** Instead, **right-click** (or Control-click) on Glance in your Applications folder
2. Select **Open** from the menu
3. A dialog will appear — click **Open** again
4. macOS will remember your choice, and it will open normally from now on

### macOS: Screen captures are blank or the hotkey doesn't work

Make sure Screen Recording permission is enabled:
1. Open **System Settings > Privacy & Security > Screen Recording**
2. Toggle **Glance** on
3. Restart Glance

### Windows: The hotkey doesn't work

Another application may be using `Ctrl+Shift+G`. Check your other running apps (e.g., gaming overlays, screenshot tools) and disable their conflicting shortcut.

### Linux: AppImage won't run

Make sure the file is marked as executable:
```bash
chmod +x Glance-1.1.0.AppImage
./Glance-1.1.0.AppImage
```

Some desktop environments require you to right-click the file and enable **"Allow executing file as program"**.

---

## Feedback

This is a beta build. If you run into bugs or have ideas, hit the **Send Feedback** button in Settings or email [whitemanoscar@gmail.com](mailto:whitemanoscar@gmail.com).

---

## License

All rights reserved.
