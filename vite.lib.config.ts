import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import dts from 'vite-plugin-dts'
import { fileURLToPath, URL } from 'node:url'

// Library build for @ohdsi/atlas-ui. vue + vuetify are peers (externalized).
export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    dts({ include: ['packages/atlas-ui/index.ts', 'src/ui/**', 'src/components/ui/**'], outDir: 'packages/atlas-ui/dist', rollupTypes: true }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: 'packages/atlas-ui/dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL('./packages/atlas-ui/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'atlas-ui.js',
    },
    rollupOptions: {
      external: ['vue', /^vuetify($|\/)/, /^echarts($|\/)/, 'vue-echarts'],
      output: { assetFileNames: 'atlas-ui.[ext]', globals: { vue: 'Vue' } },
    },
  },
})
