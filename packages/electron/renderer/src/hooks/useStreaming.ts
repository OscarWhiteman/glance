import { useEffect, useState } from 'react';
import type { AIResponse } from '@glance/shared';

export type StreamState = 'idle' | 'streaming' | 'done' | 'error' | 'permissions';

export interface StreamingResult {
  state: StreamState;
  tokens: string;
  result: AIResponse | null;
  error: string | null;
}

export function useStreaming(): StreamingResult {
  const [state, setState] = useState<StreamState>('idle');
  const [tokens, setTokens] = useState('');
  const [result, setResult] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const removers: Array<() => void> = [];

    removers.push(
      window.glance.onStreamStart(() => {
        setState('streaming');
        setTokens('');
        setResult(null);
        setError(null);
      }),
    );

    removers.push(
      window.glance.onStreamToken((token) => {
        setTokens((t) => t + token);
      }),
    );

    removers.push(
      window.glance.onStreamDone((r) => {
        setResult(r);
        setState('done');
      }),
    );

    removers.push(
      window.glance.onStreamError((msg) => {
        setError(msg);
        setState('error');
      }),
    );

    removers.push(
      window.glance.onStatus((status) => {
        if (status.type === 'permissions') {
          setState('permissions');
        } else if (status.type === 'error') {
          setError(status.text ?? 'Unknown error');
          setState('error');
        }
      }),
    );

    return () => removers.forEach((r) => r());
  }, []);

  return { state, tokens, result, error };
}
