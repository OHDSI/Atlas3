import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig({
  plugins: [
    vue(),
    // styles: 'none' disables vite-plugin-vuetify's per-component CSS
    // injection. The host page already serves Vuetify CSS at the same
    // major version, so the plugin reuses those classnames without
    // shipping a duplicate (and conflicting) stylesheet.
    vuetify({ autoImport: true, styles: 'none' }),
  ],
  build: {
    cssCodeSplit: false,
    lib: {
      entry: './src/main.ts',
      formats: ['system'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        format: 'system',
        globals: { vue: 'vue' },
      },
    },
    outDir: '../../public/plugins/pythia-plugin',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.spec.ts'],
  },
});
