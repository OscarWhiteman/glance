import { useState } from 'react';

export function PermissionsGuard() {
  const [checking, setChecking] = useState(false);
  const [denied, setDenied] = useState(false);

  async function recheck() {
    setChecking(true);
    setDenied(false);
    const granted = await window.glance.recheckPermissions();
    setChecking(false);
    if (granted) {
      // Permission now granted — hide the guard by resetting status
      // The user can press the hotkey again to capture
      window.glance.relaunchApp();
    } else {
      setDenied(true);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-4">
      <div className="text-4xl">🔒</div>
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-1">
          Screen Recording Permission Required
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Glance needs permission to capture your screen. Grant access in System Settings.
        </p>
      </div>

      <ol className="text-left text-sm text-slate-400 space-y-1 bg-white/5 rounded-lg px-4 py-3 w-full">
        <li>1. Open <strong className="text-slate-300">System Settings</strong></li>
        <li>2. Go to <strong className="text-slate-300">Privacy &amp; Security</strong></li>
        <li>3. Select <strong className="text-slate-300">Screen Recording</strong></li>
        <li>4. Enable the toggle next to <strong className="text-slate-300">Glance</strong></li>
      </ol>

      <button
        onClick={() => window.glance.openSettings()}
        className="no-drag w-full bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Open System Settings
      </button>

      {denied && (
        <p className="text-[11px] text-amber-400">
          Permission still not detected. macOS usually requires a full restart of the app after granting screen recording access.
        </p>
      )}

      <div className="flex gap-2 w-full">
        <button
          onClick={() => void recheck()}
          disabled={checking}
          className="no-drag flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium py-2 px-4 rounded-lg border border-white/10 transition-colors disabled:opacity-50"
        >
          {checking ? 'Checking…' : 'Recheck Permission'}
        </button>
        <button
          onClick={() => window.glance.relaunchApp()}
          className="no-drag flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium py-2 px-4 rounded-lg border border-white/10 transition-colors"
        >
          Restart Glance
        </button>
      </div>
    </div>
  );
}
