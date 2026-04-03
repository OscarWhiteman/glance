import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Glance] React error boundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-screen flex flex-col items-center justify-center gap-3 p-6 text-center rounded-xl border border-white/10 bg-black/50 backdrop-blur-sm">
          <span className="text-2xl">Something went wrong</span>
          <p className="text-[12px] text-slate-400 max-w-[320px] leading-relaxed">
            Glance hit an unexpected error. You can try reloading the window or restarting the app.
          </p>
          <pre className="mt-2 max-w-full overflow-auto text-[11px] text-red-400/80 bg-black/40 rounded p-2 max-h-32">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-1.5 text-[12px] font-medium bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded hover:bg-sky-500/30 transition-colors"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
