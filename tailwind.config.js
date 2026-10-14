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
        // One clean sans for everything; mono only for small format tags.
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'Consolas', 'monospace']
      },
      borderRadius: {
        card: '12px'
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px -12px rgba(16, 24, 40, 0.12)'
      }
    }
  },
  plugins: []
}
