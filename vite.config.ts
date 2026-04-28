import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    vue(),
    // Vuetify plugin for auto-importing components and tree-shaking
    vuetify({ autoImport: true }),
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
    proxy: {
      // Proxy WebAPI requests to local WebAPI instance
      '/WebAPI': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        // Rewrite Origin/Referer to the proxy target so WebAPI's CORS filter
        // accepts the request. Without this, the browser-supplied Origin
        // (http://localhost:5173) is forwarded verbatim and WebAPI rejects
        // it with "Invalid CORS request" — login fails on the dev server.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'http://localhost:8080')
            proxyReq.setHeader('referer', 'http://localhost:8080/')
          })
        },
      },
    },
  },
})
