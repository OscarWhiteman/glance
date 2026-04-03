# Glance

**Instant AI screen analysis for Windows, macOS, and Linux.**

Capture any part of your screen and get an AI-powered explanation, debug analysis, or code conversion in seconds. Glance lives in your system tray and works with a single keyboard shortcut.

## Download

**[Download Glance v1.0.0 Beta](https://github.com/OscarWhiteman/glance/releases/tag/v1.0.0-beta)**

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | `Glance-1.0.0-arm64.dmg` |
| Windows | `Glance-Setup-1.0.0.exe` |
| Linux | `Glance-1.0.0.AppImage` |

> Requires an API key from Anthropic, OpenAI, or Google Gemini. You'll be prompted to enter one on first launch.

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

1. Download `Glance-Setup-1.0.0.exe` from the [Releases](../../releases) page
2. Run the installer — it will install and launch Glance automatically
3. Glance will appear in your system tray
4. Follow the onboarding wizard to enter your API key

### Install on macOS

1. Download `Glance-1.0.0-arm64.dmg` from the [Releases](../../releases) page
2. Open the DMG and drag **Glance** to your Applications folder
3. **Right-click > Open** the first time (the app is unsigned, so macOS will block a normal double-click)
4. Follow the onboarding wizard to enter your API key

### Install on Linux

1. Download `Glance-1.0.0.AppImage` from the [Releases](../../releases) page
2. Make it executable: `chmod +x Glance-1.0.0.AppImage`
3. Run it: `./Glance-1.0.0.AppImage`
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
chmod +x Glance-1.0.0.AppImage
./Glance-1.0.0.AppImage
```

Some desktop environments require you to right-click the file and enable **"Allow executing file as program"**.

---

## Feedback

This is a beta build. If you run into bugs or have ideas, hit the **Send Feedback** button in Settings or email [oscarwhiteman985@gmail.com](mailto:oscarwhiteman985@gmail.com).

---

## License

All rights reserved.
