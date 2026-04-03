import { useState, useCallback } from 'react';
import type { HistoryEntry } from '@glance/shared';

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.glance.getHistory();
      setEntries(data.slice(0, 10));  // show last 10
    } catch {
      // ignore — no history file yet
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(async () => {
    await window.glance.clearHistory();
    setEntries([]);
  }, []);

  return { entries, loading, refresh, clear };
}
