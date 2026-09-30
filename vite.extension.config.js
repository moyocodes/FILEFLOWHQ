import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Chrome extension (Manifest V3) build: `npm run build:extension`.
// No PWA plugin (the extension has its own lifecycle) and a separate publicDir
// so the website's static files aren't copied into the extension package.
export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: 'extension/public',
  build: {
    target: 'esnext',
    outDir: 'dist-extension',
    emptyOutDir: true,
    rollupOptions: { input: 'sidepanel.html' },
  },
})
