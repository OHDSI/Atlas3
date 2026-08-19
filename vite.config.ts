import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'

// E2E runs `vite --mode test`, where no WebAPI exists. Left to the proxy below,
// every request a spec forgot to mock produces a multi-line ECONNREFUSED stack
// trace in the CI log (~110 lines a run) and, worse, resolves against whatever
// WebAPI a developer happens to have on :8080 — which is how screenshot
// baselines ended up encoding one machine's live data. Answering 503 here makes
// an unmocked call fail the same way everywhere, quietly.
function stubWebApi(): Plugin {
  return {
    name: 'atlas:stub-webapi',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/WebAPI')) return next()
        res.statusCode = 503
        res.setHeader('content-type', 'application/json')
        res.end('{"error":"WebAPI is not proxied in test mode; mock this endpoint"}')
      })
    },
  }
}

// Point the dev proxy at a remote WebAPI with `WEBAPI_URL=https://host npm run dev`.
const webApiTarget = process.env.WEBAPI_URL ?? 'http://localhost:8080'
const webApiOrigin = new URL(webApiTarget).origin

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    vue(),
    // Vuetify plugin for auto-importing components and tree-shaking
    vuetify({ autoImport: true }),
    ...(mode === 'test' ? [stubWebApi()] : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-vuetify': ['vuetify'],
          'vendor-utils': ['zod', 'date-fns'],
        },
      },
    },
    // Performance budgets per plan.md
    chunkSizeWarningLimit: 250, // 250KB gzipped limit
  },
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    // Not registered in test mode: stubWebApi() answers those paths instead, so
    // the suite cannot reach a backend even on a machine that has one running.
    proxy:
      mode === 'test'
        ? undefined
        : {
            // Proxy WebAPI requests to local WebAPI instance
            '/WebAPI': {
              target: webApiTarget,
              changeOrigin: true,
              secure: false,
              rewrite: (path) => path,
              // Rewrite Origin/Referer to the proxy target so WebAPI's CORS filter
              // accepts the request. Without this, the browser-supplied Origin
              // (http://localhost:5173) is forwarded verbatim and WebAPI rejects
              // it with "Invalid CORS request" — login fails on the dev server.
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  proxyReq.setHeader('origin', webApiOrigin)
                  proxyReq.setHeader('referer', `${webApiOrigin}/`)
                })
              },
            },
          },
  },
}))
