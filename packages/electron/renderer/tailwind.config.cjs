const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, 'src/**/*.{tsx,ts,jsx,js}'),
    path.join(__dirname, '*.html'),
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#e2e8f0',
            a: { color: '#38bdf8' },
            strong: { color: '#f1f5f9' },
            code: {
              color: '#7dd3fc',
              background: 'rgba(255,255,255,0.07)',
              borderRadius: '3px',
              padding: '0.15em 0.3em',
            },
            'pre code': { background: 'transparent', padding: 0 },
            h1: { color: '#f1f5f9' },
            h2: { color: '#f1f5f9' },
            h3: { color: '#f1f5f9' },
            blockquote: { color: '#94a3b8', borderLeftColor: '#334155' },
            hr: { borderColor: 'rgba(255,255,255,0.08)' },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
