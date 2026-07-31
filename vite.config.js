import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [react(), apiDevServer(env)] }
})
