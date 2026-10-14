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
        // Poppins everywhere to match the FileFlowHQ wordmark; mono only for small format tags.
        display: ['Poppins', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        body: ['Poppins', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'Consolas', 'monospace']
      },
      borderRadius: {
        card: '18px'
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 12px 32px -14px rgba(16, 24, 40, 0.14)',
        lift: '0 2px 6px rgba(16, 24, 40, 0.04), 0 28px 60px -24px rgba(16, 24, 40, 0.28)'
      }
    }
  },
  plugins: []
}
