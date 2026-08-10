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
        // Don't precache HTML: the prerender step rewrites each route's
        // index.html AFTER the build, so a precached copy would go stale and
        // its revision hash would mismatch. Serve navigations NetworkFirst
        // instead — always fresh when online, cached copy when offline.
        globPatterns: ['**/*.{js,css,svg,png,woff,woff2,mjs}'],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-pages',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'esnext',
  },
})
