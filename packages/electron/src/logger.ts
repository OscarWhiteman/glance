export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: number;
  level: LogLevel;
  msg: string;
  detail?: string;
}

const MAX_ENTRIES = 200;
const buffer: LogEntry[] = [];

export function log(level: LogLevel, msg: string, detail?: string): void {
  buffer.unshift({ ts: Date.now(), level, msg, detail });
  if (buffer.length > MAX_ENTRIES) buffer.pop();

  // Mirror to console
  const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  console[method](`[Glance] ${msg}`, detail ?? '');
}

export function getLogs(): LogEntry[] {
  return [...buffer];
}
