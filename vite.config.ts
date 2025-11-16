import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/Atlas/',
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
      // Proxy WebAPI requests to localhost:41100
      '/WebAPI': {
        target: 'https://localhost:41100',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
    },
  },
})