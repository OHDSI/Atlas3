import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules/', 'vue-mri-ui-lib/', 'tests/e2e/**'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    server: {
      deps: {
        inline: ['vuetify'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      // Include all src/ files for coverage
      include: ['src/**/*.{ts,vue}'],
      // Documented exclusions with justifications
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        // Type declarations only - no runtime code
        '**/types.ts',
        '**/*.d.ts',
        'src/env.d.ts',
        'src/types/**',
        'src/models/**',
        'src/locales/**',
        // App bootstrap - not unit testable, tested via e2e
        'src/main.ts',
        // Root component - tested via integration/e2e tests
        'src/App.vue',
        // Vuetify configuration only - no testable logic
        'src/plugins/vuetify.ts',
        // Router configuration - tested via integration/e2e tests
        'src/router/index.ts',
      ],
      // Coverage thresholds - fail CI if coverage drops below these values
      thresholds: {
        lines: 88,
        statements: 88,
        branches: 85,
        functions: 73,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
