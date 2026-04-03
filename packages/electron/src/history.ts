import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { HistoryEntry } from '@glance/shared';

const MAX_ENTRIES = 50;

function historyPath(): string {
  return path.join(app.getPath('userData'), 'history.json');
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = fs.readFileSync(historyPath(), 'utf-8');
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function saveEntry(entry: HistoryEntry): void {
  const history = loadHistory();
  history.unshift(entry);         // newest first
  if (history.length > MAX_ENTRIES) history.splice(MAX_ENTRIES);
  fs.mkdirSync(path.dirname(historyPath()), { recursive: true });
  fs.writeFileSync(historyPath(), JSON.stringify(history, null, 2), 'utf-8');
}

export function clearHistory(): void {
  try { fs.unlinkSync(historyPath()); } catch { /* file may not exist */ }
}
