/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: 'var(--void)',
        panel: 'var(--panel)',
        'panel-raised': 'var(--panel-raised)',
        signal: 'var(--signal)',
        'signal-dim': 'var(--signal-dim)',
        text: 'var(--text)',
        'text-dim': 'var(--text-dim)',
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)'
        },
        'mono-text': 'var(--mono-text)'
      },
      fontFamily: {
        // A softer, rounder-leaning display face than the previous Futura/
        // Century Gothic stack — "Avenir Next" reads friendlier while still
        // carrying enough weight/size distinction from body text on macOS.
        display: ['"Avenir Next"', 'Avenir', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        body: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"SF Mono"', '"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace']
      },
      borderRadius: {
        card: '6px'
      },
      boxShadow: {
        card: '0 12px 28px -14px rgba(0, 0, 0, 0.4)'
      }
    }
  },
  plugins: []
}
