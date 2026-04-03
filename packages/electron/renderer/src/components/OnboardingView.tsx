import { useState } from 'react';
import type { GlanceSettings, AIProviderName } from '@glance/shared';

const PROVIDERS: { id: AIProviderName; label: string; defaultModel: string }[] = [
  { id: 'openai',    label: 'OpenAI',    defaultModel: 'gpt-4o' },
  { id: 'anthropic', label: 'Anthropic', defaultModel: 'claude-3-haiku-20240307' },
  { id: 'gemini',    label: 'Google Gemini', defaultModel: 'gemini-2.0-flash' },
];

type Step = 0 | 1 | 2;

interface OnboardingViewProps {
  initialSettings: GlanceSettings;
  onComplete: () => void;
}

export function OnboardingView({ initialSettings, onComplete }: OnboardingViewProps) {
  const [step, setStep] = useState<Step>(0);
  const [provider, setProvider] = useState<AIProviderName>(initialSettings.provider.provider);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinish() {
    if (!apiKey.trim()) {
      setError('Please enter an API key to continue.');
      return;
    }
    setSaving(true);
    setError(null);
    const info = PROVIDERS.find((p) => p.id === provider)!;
    const settings: GlanceSettings = {
      ...initialSettings,
      provider: { provider, apiKey: apiKey.trim(), model: info.defaultModel },
    };
    await window.glance.saveSettings(settings);
    setSaving(false);
    onComplete();
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ── Progress dots ── */}
      <div className="flex justify-center gap-2 pt-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === step ? 'bg-sky-400' : i < step ? 'bg-sky-400/40' : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {/* ── Step 0: Welcome + API key ── */}
      {step === 0 && (
        <div className="flex flex-col gap-4 flex-1">
          <div className="text-center">
            <h2 className="text-[15px] font-semibold text-slate-200">Welcome to Glance</h2>
            <p className="text-[12px] text-slate-500 mt-1">
              Capture any part of your screen and get instant AI analysis.
            </p>
          </div>

          <section className="flex flex-col gap-1.5">
            <label className="text-[11px] text-slate-500 uppercase tracking-wider">Choose your AI provider</label>
            <div className="flex gap-1">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`flex-1 py-1.5 text-[11px] font-medium rounded transition-colors ${
                    provider === p.id
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-white/5 text-slate-500 border border-white/10 hover:text-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500 uppercase tracking-wider">API Key</label>
            <div className="flex gap-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setError(null); }}
                placeholder="Paste your API key here"
                spellCheck={false}
                autoFocus
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[12px] text-slate-200 placeholder-slate-700 focus:outline-none focus:border-sky-500/50 font-mono"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-300 bg-white/5 border border-white/10 rounded transition-colors shrink-0"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            {error && <p className="text-[11px] text-red-400 mt-0.5">{error}</p>}
          </section>

          <div className="mt-auto">
            <button
              onClick={() => apiKey.trim() ? setStep(1) : setError('Please enter an API key to continue.')}
              className="w-full py-2 rounded text-[12px] font-medium bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Step 1: Hotkey info ── */}
      {step === 1 && (
        <div className="flex flex-col gap-4 flex-1">
          <div className="text-center">
            <h2 className="text-[15px] font-semibold text-slate-200">Your Global Hotkey</h2>
            <p className="text-[12px] text-slate-500 mt-1">
              Trigger a screen capture from anywhere with a single shortcut.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 py-4">
            <kbd className="px-4 py-2 text-[16px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-lg tracking-wide">
              Cmd + Shift + G
            </kbd>
            <p className="text-[11px] text-slate-500 text-center leading-relaxed max-w-[280px]">
              Press this anywhere on your Mac. A crosshair overlay will appear — drag to select a region, then choose an action.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <span className="text-slate-300 font-medium">Tip:</span> After selecting a region, use keyboard shortcuts for quick actions —
              <span className="text-sky-400"> D</span> Debug,
              <span className="text-sky-400"> E</span> Explain,
              <span className="text-sky-400"> K</span> Convert to Code,
              <span className="text-sky-400"> C</span> Custom prompt.
            </p>
          </div>

          <div className="mt-auto flex gap-2">
            <button
              onClick={() => setStep(0)}
              className="flex-1 py-2 rounded text-[12px] font-medium text-slate-500 border border-white/10 hover:text-slate-300 transition-all"
            >
              Back
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-2 rounded text-[12px] font-medium bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Screen recording permission ── */}
      {step === 2 && (
        <div className="flex flex-col gap-4 flex-1">
          <div className="text-center">
            <h2 className="text-[15px] font-semibold text-slate-200">Screen Recording Permission</h2>
            <p className="text-[12px] text-slate-500 mt-1">
              Glance needs screen recording access to capture screenshots.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-2">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              macOS requires you to explicitly grant screen recording permission.
              Click the button below to open System Settings, then enable <span className="text-slate-200">Glance</span> in the list.
            </p>
            <button
              onClick={() => window.glance.openSettings()}
              className="w-full py-2 rounded text-[12px] font-medium bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-all"
            >
              Open Privacy &amp; Security Settings
            </button>
          </div>

          <p className="text-[11px] text-slate-600 text-center">
            You can always grant this later — Glance will prompt you when needed.
          </p>

          <div className="mt-auto flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-2 rounded text-[12px] font-medium text-slate-500 border border-white/10 hover:text-slate-300 transition-all"
            >
              Back
            </button>
            <button
              onClick={() => void handleFinish()}
              disabled={saving}
              className="flex-1 py-2 rounded text-[12px] font-medium bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Get Started'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
