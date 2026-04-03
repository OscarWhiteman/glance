import { useState } from 'react';

interface CodeBlockProps {
  language?: string;
  children: string;
}

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative my-3 rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-white/3">
        <span className="text-[11px] font-medium text-slate-500 font-mono">
          {language ?? 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="no-drag text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-0.5 rounded hover:bg-white/10"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      {/* Code */}
      <pre className="overflow-x-auto p-3 m-0 bg-transparent">
        <code className="text-[13px] leading-relaxed text-slate-200 font-mono">
          {children}
        </code>
      </pre>
    </div>
  );
}
