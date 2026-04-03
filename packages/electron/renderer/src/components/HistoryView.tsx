import { useEffect, useState } from 'react';
import type { HistoryEntry } from '@glance/shared';
import { useHistory } from '../hooks/useHistory';

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function HistoryView({ onLoadEntry }: { onLoadEntry: (entry: HistoryEntry) => void }) {
  const { entries, loading, refresh, clear } = useHistory();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { void refresh(); }, [refresh]);

  if (loading) {
    return <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-slate-500 text-sm">No history yet.</p>
        <p className="text-slate-600 text-xs mt-1">Captures will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => {
        const isOpen = expanded === entry.id;
        return (
          <div
            key={entry.id}
            className="rounded-lg border border-white/8 bg-white/4 overflow-hidden"
          >
            {/* Summary row */}
            <button
              onClick={() => setExpanded(isOpen ? null : entry.id)}
              className="w-full text-left px-3 py-2.5 flex items-start gap-2 hover:bg-white/5 transition-colors no-drag"
            >
              <span className="mt-0.5 text-base shrink-0">
                {entry.source === 'extension' ? '🌐' : '📷'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-slate-300 truncate">{entry.prompt}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-600">
                  <span>{relativeTime(entry.timestamp)}</span>
                  <span>·</span>
                  <span>{entry.model}</span>
                  <span>·</span>
                  <span>{entry.durationMs}ms</span>
                </div>
              </div>
              <span className="text-slate-600 text-xs mt-1 shrink-0">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Expanded response */}
            {isOpen && (
              <div className="border-t border-white/8 px-3 py-2.5 space-y-2">
                <p className="text-[12px] text-slate-400 whitespace-pre-wrap leading-relaxed line-clamp-10">
                  {entry.responseText}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onLoadEntry(entry)}
                    className="no-drag text-[11px] text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Load in viewer
                  </button>
                  <span className="text-slate-700">·</span>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(entry.responseText);
                    }}
                    className="no-drag text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Clear button */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={async () => {
            await clear();
            await refresh();
          }}
          className="no-drag text-[11px] text-slate-600 hover:text-red-400 transition-colors"
        >
          Clear history
        </button>
      </div>
    </div>
  );
}
