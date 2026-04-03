import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const CRASH_LOG_PATH = path.join(app.getPath('userData'), 'crash.log');
const MAX_SIZE = 512 * 1024; // 512 KB — rotate if exceeded

function timestamp(): string {
  return new Date().toISOString();
}

function appendLine(line: string): void {
  try {
    // Rotate if the file is too large
    try {
      const stat = fs.statSync(CRASH_LOG_PATH);
      if (stat.size > MAX_SIZE) {
        const backup = CRASH_LOG_PATH + '.old';
        fs.renameSync(CRASH_LOG_PATH, backup);
      }
    } catch {
      // file doesn't exist yet — fine
    }
    fs.appendFileSync(CRASH_LOG_PATH, line + '\n', 'utf-8');
  } catch {
    // If we can't write, there's nothing useful we can do
  }
}

export function setupCrashLogging(): void {
  process.on('uncaughtException', (err) => {
    appendLine(`[${timestamp()}] UNCAUGHT EXCEPTION: ${err.stack ?? err.message}`);
    console.error('[Glance] Uncaught exception:', err);
  });

  process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? (reason.stack ?? reason.message) : String(reason);
    appendLine(`[${timestamp()}] UNHANDLED REJECTION: ${msg}`);
    console.error('[Glance] Unhandled rejection:', reason);
  });

  appendLine(`[${timestamp()}] Glance started (Electron ${process.versions.electron})`);
}
