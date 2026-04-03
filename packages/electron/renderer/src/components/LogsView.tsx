import { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '../types/glance';

const LEVEL_STYLES: Record<string, string> = {
  info:  'text-slate-400',
  warn:  'text-amber-400',
  error: 'text-red-400',
};

function formatTs(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

export function LogsView() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    const data = await window.glance.getLogs();
    setLogs(data);
  }

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => void refresh(), 1500);
    return () => clearInterval(id);
  }, [autoRefresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500 uppercase tracking-wider">Debug Logs</span>
        <div className="flex items-center gap-2">
          <label className="no-drag flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-sky-400 w-3 h-3"
            />
            Live
          </label>
          <button
            onClick={() => void refresh()}
            className="no-drag text-[11px] text-slate-600 hover:text-slate-300 transition-colors"
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-0.5 font-mono text-[11px] bg-black/30 rounded-lg p-2">
        {logs.length === 0 && (
          <p className="text-slate-600 text-center py-4">No logs yet.</p>
        )}
        {[...logs].reverse().map((entry, i) => (
          <div key={i} className="flex gap-2 leading-relaxed min-w-0">
            <span className="text-slate-700 shrink-0">{formatTs(entry.ts)}</span>
            <span className={`shrink-0 w-8 ${LEVEL_STYLES[entry.level] ?? 'text-slate-400'}`}>
              {entry.level.toUpperCase().slice(0, 3)}
            </span>
            <span className="text-slate-300 min-w-0 break-words">{entry.msg}</span>
            {entry.detail && (
              <span className="text-slate-600 min-w-0 truncate">{entry.detail}</span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
