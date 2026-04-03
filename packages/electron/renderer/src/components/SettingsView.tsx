import { useEffect, useState } from 'react';
import type { GlanceSettings, AIProviderName } from '@glance/shared';

const PROVIDERS: { id: AIProviderName; label: string; defaultModel: string }[] = [
  { id: 'openai',    label: 'OpenAI',    defaultModel: 'gpt-4o' },
  { id: 'anthropic', label: 'Anthropic', defaultModel: 'claude-3-haiku-20240307' },
  { id: 'gemini',    label: 'Google Gemini', defaultModel: 'gemini-2.0-flash' },
];

interface KeyFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function KeyField({ label, value, onChange }: KeyFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="flex gap-1">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="sk-..."
          spellCheck={false}
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-slate-200 placeholder-slate-700 focus:outline-none focus:border-sky-500/50 font-mono"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-300 bg-white/5 border border-white/10 rounded transition-colors shrink-0"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

interface SettingsViewProps {
  onDone: () => void;
}

export function SettingsView({ onDone }: SettingsViewProps) {
  const [settings, setSettings] = useState<GlanceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  // Per-provider API key storage — keep keys in local state so switching providers doesn't lose them
  const [apiKeys, setApiKeys] = useState<Record<AIProviderName, string>>({
    openai: '',
    anthropic: '',
    gemini: '',
  });

  useEffect(() => {
    window.glance.getSettings().then((s) => {
      setSettings(s);
      setApiKeys((prev) => ({ ...prev, [s.provider.provider]: s.provider.apiKey }));
    });
    window.glance.getAppInfo().then((info) => setAppVersion(info.version));
  }, []);

  if (!settings) return null;

  function updateProvider(provider: AIProviderName) {
    setSettings((prev) => {
      if (!prev) return prev;
      const info = PROVIDERS.find((p) => p.id === provider)!;
      return {
        ...prev,
        provider: {
          provider,
          apiKey: apiKeys[provider],
          model: info.defaultModel,
        },
      };
    });
  }

  function setKey(provider: AIProviderName, key: string) {
    setApiKeys((prev) => ({ ...prev, [provider]: key }));
    // If editing the active provider, also update settings
    setSettings((prev) => {
      if (!prev || prev.provider.provider !== provider) return prev;
      return { ...prev, provider: { ...prev.provider, apiKey: key } };
    });
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    // Ensure the active provider's key is current
    const toSave: GlanceSettings = {
      ...settings,
      provider: {
        ...settings.provider,
        apiKey: apiKeys[settings.provider.provider],
      },
    };
    await window.glance.saveSettings(toSave);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Settings</span>
        <button
          onClick={async () => { await handleSave(); onDone(); }}
          className="text-[11px] text-slate-600 hover:text-slate-300 transition-colors"
        >
          Done
        </button>
      </div>

      {/* ── Provider selector ── */}
      <section className="flex flex-col gap-1.5">
        <label className="text-[11px] text-slate-500 uppercase tracking-wider">Provider</label>
        <div className="flex gap-1">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => updateProvider(p.id)}
              className={`flex-1 py-1.5 text-[11px] font-medium rounded transition-colors ${
                settings.provider.provider === p.id
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-white/5 text-slate-500 border border-white/10 hover:text-slate-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── API Keys ── */}
      <section className="flex flex-col gap-2.5">
        <KeyField label="OpenAI API Key" value={apiKeys.openai} onChange={(v) => setKey('openai', v)} />
        <KeyField label="Anthropic API Key" value={apiKeys.anthropic} onChange={(v) => setKey('anthropic', v)} />
        <KeyField label="Google AI API Key" value={apiKeys.gemini} onChange={(v) => setKey('gemini', v)} />
      </section>

      {/* ── Model override ── */}
      <section className="flex flex-col gap-1">
        <label className="text-[11px] text-slate-500 uppercase tracking-wider">Model</label>
        <input
          value={settings.provider.model ?? ''}
          onChange={(e) =>
            setSettings((prev) =>
              prev ? { ...prev, provider: { ...prev.provider, model: e.target.value } } : prev
            )
          }
          placeholder={PROVIDERS.find((p) => p.id === settings.provider.provider)?.defaultModel}
          spellCheck={false}
          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-slate-200 placeholder-slate-700 focus:outline-none focus:border-sky-500/50 font-mono"
        />
      </section>

      {/* ── Toggles ── */}
      <section className="flex flex-col gap-2">
        <label className="text-[11px] text-slate-500 uppercase tracking-wider">Preferences</label>

        <label className="flex items-center justify-between gap-2 text-[12px] text-slate-300 cursor-pointer">
          Always on Top
          <input
            type="checkbox"
            checked={true}
            disabled
            className="accent-sky-400 w-3.5 h-3.5"
            title="Controlled via pin button in header"
          />
        </label>

        <label className="flex items-center justify-between gap-2 text-[12px] text-slate-300 cursor-pointer">
          Launch at Login
          <input
            type="checkbox"
            checked={settings.launchAtLogin}
            onChange={(e) =>
              setSettings((prev) => (prev ? { ...prev, launchAtLogin: e.target.checked } : prev))
            }
            className="accent-sky-400 w-3.5 h-3.5"
          />
        </label>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-slate-300">Capture Delay</span>
          <div className="flex items-center gap-1.5">
            <input
              type="range"
              min={0}
              max={500}
              step={50}
              value={settings.captureDelay}
              onChange={(e) =>
                setSettings((prev) =>
                  prev ? { ...prev, captureDelay: Number(e.target.value) } : prev
                )
              }
              className="w-20 accent-sky-400"
            />
            <span className="text-[11px] text-slate-500 w-10 text-right font-mono">
              {settings.captureDelay}ms
            </span>
          </div>
        </div>
      </section>

      {/* ── Hotkey (read-only info) ── */}
      <section className="flex items-center justify-between">
        <span className="text-[12px] text-slate-300">Global Hotkey</span>
        <kbd className="px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded">
          {settings.hotkey.replace('CommandOrControl', 'Cmd').replace('+', ' + ')}
        </kbd>
      </section>

      {/* ── Feedback ── */}
      <section className="pt-3 mt-1 border-t border-white/8">
        <button
          onClick={() => void window.glance.openExternal('mailto:oscarwhiteman985@gmail.com?subject=Glance%20Beta%20Feedback')}
          className="w-full py-2 rounded text-[12px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
        >
          Send Feedback
        </button>
      </section>

      {/* ── About ── */}
      <section className="pt-3 mt-1 border-t border-white/8 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-slate-400 font-medium">Glance</span>
          <span className="text-[11px] text-slate-600 font-mono">v{appVersion || '—'}</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Instant AI screen analysis.{' '}
          <a
            href="https://github.com/glance-app/glance"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-500/70 hover:text-sky-400 transition-colors"
          >
            GitHub
          </a>
        </p>
      </section>

      {/* ── Save button ── */}
      <div className="mt-auto pt-2 border-t border-white/8">
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className={`w-full py-2 rounded text-[12px] font-medium transition-all ${
            saved
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30'
          } disabled:opacity-50`}
        >
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
