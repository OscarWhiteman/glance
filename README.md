# Glance

**Instant AI screen analysis for macOS.**

Capture any part of your screen and get an AI-powered explanation, debug analysis, or code conversion in seconds. Glance lives in your menu bar and works with a single keyboard shortcut.

---

## How It Works

1. **Press `Cmd + Shift + G`** from anywhere on your Mac
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

- macOS (Apple Silicon)
- An API key from one of these providers:
  - [Anthropic](https://console.anthropic.com/) (default — uses Claude 3 Haiku)
  - [OpenAI](https://platform.openai.com/api-keys)
  - [Google Gemini](https://aistudio.google.com/app/apikey)

### Install

1. Download `Glance-1.0.0-arm64.dmg` from the [Releases](../../releases) page
2. Open the DMG and drag **Glance** to your Applications folder
3. **Right-click > Open** the first time (the app is unsigned, so macOS will block a normal double-click)
4. Follow the onboarding wizard to enter your API key

### Chrome Extension (Optional)

1. Open `chrome://extensions` in Google Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `packages/extension/dist` folder
5. Right-click any webpage element and choose **"Send to Glance"**

---

## macOS Screen Recording Permission

> **This is required.** Glance cannot capture your screen without it.

When you first use the hotkey, macOS will ask you to grant Screen Recording permission. If it doesn't, or if captures appear blank:

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

# Package a DMG for distribution
npm run pack --workspace=packages/electron
```

### Project Structure

```
packages/
  shared/       — TypeScript types + AI provider abstraction (OpenAI, Anthropic, Gemini)
  electron/     — Desktop app (Electron + React + Tailwind)
  extension/    — Chrome MV3 browser extension
```

---

## Feedback

This is a beta build. If you run into bugs or have ideas, hit the **Send Feedback** button in Settings or email [oscarwhiteman985@gmail.com](mailto:oscarwhiteman985@gmail.com).

---

## License

All rights reserved.
