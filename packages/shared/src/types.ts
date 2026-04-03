// ── AI Provider types ────────────────────────────────────────────────────────

export type AIProviderName = "openai" | "anthropic" | "gemini";

export interface AIProviderConfig {
  provider: AIProviderName;
  apiKey: string;
  model?: string;
}

export interface AIRequestOptions {
  imageBase64?: string;      // PNG or JPEG, base64-encoded (omit for text-only queries)
  imageMimeType?: "image/png" | "image/jpeg";
  textContent?: string;      // web content for extension-sourced queries
  prompt: string;
  maxTokens?: number;
  signal?: AbortSignal;      // cancel an in-flight request
}

// ── History ──────────────────────────────────────────────────────────────────

export type QuerySource = "hotkey" | "extension";

export interface HistoryEntry {
  id: string;
  timestamp: number;         // unix ms
  prompt: string;
  responseText: string;
  provider: string;
  model: string;
  durationMs: number;
  source: QuerySource;
}

export interface AIResponse {
  text: string;
  provider: AIProviderName;
  model: string;
  durationMs: number;
}

// ── Capture types ─────────────────────────────────────────────────────────────

export interface CaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  displayId?: number;       // for multi-monitor setups
}

export interface CaptureResult {
  imageBase64: string;
  mimeType: "image/png";
  region: CaptureRegion;
  capturedAt: number;       // unix ms
}

// ── WebSocket message protocol (Electron ↔ Extension) ────────────────────────

export type WSMessageType =
  | "CAPTURE_REQUEST"
  | "CAPTURE_RESULT"
  | "AI_REQUEST"
  | "AI_RESPONSE"
  | "AI_ERROR"
  | "PING"
  | "PONG";

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  id: string;               // UUID for request/response correlation
  payload: T;
}

export interface CaptureRequestPayload {
  prompt: string;
  region?: CaptureRegion;   // omit to trigger interactive region selection
}

export interface AIErrorPayload {
  message: string;
  code?: string;
}

// ── App settings ──────────────────────────────────────────────────────────────

// ── Action picker ──────────────────────────────────────────────────────────────

export type ActionType = "debug" | "explain" | "code" | "custom";

export interface ActionPickPayload {
  action: ActionType;
  customPrompt?: string;
}

export const ACTION_PROMPTS: Record<ActionType, string> = {
  debug: "Debug this screenshot. Identify the issue, explain why it happens, and suggest a fix.",
  explain: "Explain what you see in this screenshot clearly and concisely.",
  custom: "",
  code: `You are an expert React/TypeScript developer. Convert this screenshot into a production-ready component.

Output EXACTLY in this two-section format (no deviations):

## Component
\`\`\`tsx
import React from 'react';

// TypeScript interfaces here
interface Props {}

export default function Component(props: Props) {
  return (
    // JSX here
  );
}
\`\`\`

## Preview
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Preview</title>
</head>
<body class="p-4">
  <!-- Standalone HTML+Tailwind reproduction of the UI. Must be complete and self-contained. -->
</body>
</html>
\`\`\`

Rules:
- Use semantic HTML5 with ARIA attributes (role, aria-label) for accessibility
- Tailwind CSS only — no custom CSS classes
- TypeScript interfaces for all props
- Match the layout, colors, spacing, and typography from the screenshot exactly
- The Preview section must be a COMPLETE, standalone HTML document using only Tailwind CDN`,
};

// ── App settings ──────────────────────────────────────────────────────────────

export interface GlanceSettings {
  provider: AIProviderConfig;
  hotkey: string;           // e.g. "CommandOrControl+Shift+G"
  wsPort: number;           // default 43210
  defaultPrompt: string;
  captureDelay: number;     // ms to wait after hiding window before capturing (default 200)
  launchAtLogin: boolean;
}

export const DEFAULT_SETTINGS: GlanceSettings = {
  provider: {
    provider: "anthropic",
    apiKey: "",
    model: "claude-3-haiku-20240307",
  },
  hotkey: "CommandOrControl+Shift+G",
  wsPort: 43210,
  defaultPrompt: "Describe what you see in this screenshot.",
  captureDelay: 200,
  launchAtLogin: false,
};
