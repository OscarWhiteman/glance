import { useState, useRef, useEffect } from 'react';

const ACTIONS = [
  { id: 'debug',   label: 'Debug',            icon: '🐛', shortcut: 'D' },
  { id: 'explain', label: 'Explain',          icon: '💡', shortcut: 'E' },
  { id: 'code',    label: 'Convert to Code',  icon: '⚡', shortcut: 'K' },
  { id: 'custom',  label: 'Custom…',          icon: '✏️', shortcut: 'C' },
] as const;

export function ActionPicker() {
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCustom) inputRef.current?.focus();
  }, [showCustom]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { window.picker.cancel(); return; }
      if (showCustom) return;
      const action = ACTIONS.find((a) => a.shortcut.toLowerCase() === e.key.toLowerCase());
      if (!action) return;
      if (action.id === 'custom') { setShowCustom(true); }
      else { window.picker.pick({ action: action.id }); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCustom]);

  function handleAction(id: typeof ACTIONS[number]['id']) {
    if (id === 'custom') { setShowCustom(true); }
    else { window.picker.pick({ action: id }); }
  }

  function handleCustomSubmit() {
    const prompt = customText.trim();
    if (prompt) window.picker.pick({ action: 'custom', customPrompt: prompt });
  }

  return (
    <div className="h-screen flex flex-col justify-center p-2 rounded-xl border border-white/10 bg-black/75 backdrop-blur-md">
      {!showCustom ? (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] text-slate-500 text-center mb-1 tracking-wider uppercase">
            What should Glance do?
          </p>
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-lg text-sm text-slate-300
                         hover:bg-white/10 hover:text-white transition-colors text-left group"
            >
              <span className="text-base w-5 text-center">{action.icon}</span>
              <span className="flex-1 font-medium">{action.label}</span>
              <kbd className="text-[10px] font-mono bg-white/8 text-slate-500 group-hover:text-slate-400
                              px-1.5 py-0.5 rounded border border-white/10">
                {action.shortcut}
              </kbd>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-slate-500 tracking-wider uppercase">Custom prompt</p>
          <input
            ref={inputRef}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCustomSubmit();
              if (e.key === 'Escape') { setShowCustom(false); setCustomText(''); }
            }}
            placeholder="Describe what you need…"
            className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-sm
                       text-white placeholder:text-slate-500 outline-none
                       focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-colors"
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customText.trim()}
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            Send ↵
          </button>
        </div>
      )}
    </div>
  );
}
