import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const STUDIO_CACHE = join(process.cwd(), '.studio-cache')
const STUDIO_TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }

/**
 * Dev only: serves /studio-apps/<id>/<version>/<file> from .studio-cache/<id>/<version>/
 * (fill it with `npm run studio:fetch`). Production builds copy the same files
 * into dist/studio-apps — see scripts/fetch-studio-apps.mjs.
 */
function studioAppsDev() {
  return {
    name: 'studio-apps-dev',
    configureServer(server) {
      server.middlewares.use('/studio-apps', (req, res, next) => {
        const parts = decodeURIComponent(req.url.split('?')[0]).split('/').filter(Boolean)
        if (parts.length < 3 || parts.includes('..')) return next()
        const [id, version, ...rest] = parts
        // Our rebranded builds (studio-builds/<id>/) win over upstream downloads.
        const branded = join(process.cwd(), 'studio-builds', id)
        let file = join(existsSync(join(branded, 'app.html')) ? branded : join(STUDIO_CACHE, id, version), ...rest)
        if (rest.length === 1 && rest[0] === 'app') file += '.html'
        if (!existsSync(file) || !statSync(file).isFile()) return next()
        res.setHeader('Content-Type', STUDIO_TYPES[extname(file)] || 'application/octet-stream')
        createReadStream(file).pipe(res)
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  // Changes on every deploy (Vercel commit SHA, else build time) so the app can
  // reset stored state for a fresh start — see src/utils/deployReset.js.
  define: {
    __BUILD_ID__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now()))
  },
  plugins: [
    react(),
    studioAppsDev(),
    // Makes the web build installable (Add to Home Screen) and offline-capable.
    // Native iOS/Android builds don't use this — Capacitor wraps the same dist/.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.svg', 'logofull.svg', 'logofull-light.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'FileFlowHQ — File Converter',
        short_name: 'FileFlowHQ',
        description:
          'Convert images, PDFs, and data files for free, right in your browser. No uploads, no server, no tracking.',
        theme_color: '#121718',
        background_color: '#121718',
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
        // Studio editors are 15–80 MB each; the browser caches them on first open instead.
        // Converter engines (public/engines/<name>/<version>/) download when a tool first needs them.
        globIgnores: ['studio-apps/**', 'engines/*/**'],
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
