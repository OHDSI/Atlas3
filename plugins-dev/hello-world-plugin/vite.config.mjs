import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: './src/main.ts',
      formats: ['system'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [],
      output: {
        format: 'system',
      },
    },
    outDir: '../../public/plugins/hello-world-plugin',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
});
