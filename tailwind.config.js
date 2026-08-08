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
        // Rounded, bubbly pairing for a playful feel: Fredoka for display/
        // headings (chunky, friendly), Quicksand for body (rounded but
        // still readable at small sizes). Both loaded via Google Fonts.
        display: ['Fredoka', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        body: ['Quicksand', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
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
