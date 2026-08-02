import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// `vite dev` doesn't run Vercel's serverless functions, so /api/ai would 404 locally and
// every AI feature would silently fall back. This mounts the same handler as dev middleware
// so local dev exercises the real path instead of only the failure path.
function apiDevServer(env) {
  return {
    name: 'api-dev-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        const { default: handler } = await import('./api/ai.js')

        const body = await new Promise((resolve) => {
          let raw = ''
          req.on('data', (chunk) => (raw += chunk))
          req.on('end', () => {
            try {
              resolve(JSON.parse(raw || '{}'))
            } catch {
              resolve({})
            }
          })
        })

        // Vercel injects env vars into process.env; Vite doesn't load .env into it.
        process.env.DEEPSEEK_API_KEY ??= env.DEEPSEEK_API_KEY

        // Minimal shim of the Vercel handler's (req, res) contract.
        await handler({ method: req.method, body }, {
          status(code) {
            res.statusCode = code
            return this
          },
          json(payload) {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(payload))
          },
        })
      })
    },
  }
}

const pwa = VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
  manifest: {
    name: 'Quran Context Search',
    short_name: 'Quran Search',
    description:
      'Cari ayat Al-Quran berdasarkan topik atau makna, lengkap dengan ringkasan tafsir.',
    lang: 'id',
    theme_color: '#059669',
    background_color: '#f9fafb',
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/',
    scope: '/',
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: 'maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
    // The app shell is precached, but UmmahAPI responses are not bundled — cache them at
    // runtime so a previously-viewed search still renders offline. NetworkFirst (not
    // CacheFirst) so a reachable network always wins and results stay current.
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/ummahapi\.com\/api\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'ummahapi-cache',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
    // /api/ai is a POST proxy to a paid model — never cache it, and don't let the SPA
    // fallback swallow the route and hand back index.html.
    navigateFallbackDenylist: [/^\/api\//],
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [react(), apiDevServer(env), pwa] }
})
