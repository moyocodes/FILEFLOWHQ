import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Makes the web build installable (Add to Home Screen) and offline-capable.
    // Native iOS/Android builds don't use this — Capacitor wraps the same dist/.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'FileFlowHQ — File Converter',
        short_name: 'FileFlowHQ',
        description:
          'Convert images, PDFs, and data files for free, right in your browser. No uploads, no server, no tracking.',
        theme_color: '#0e8f5c',
        background_color: '#f4f6f5',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Bump the precache limit — the pdfjs/docx bundles are large.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // SPA fallback so client-side routes work offline.
        navigateFallback: '/index.html',
      },
    }),
  ],
  build: {
    target: 'esnext',
  },
})
