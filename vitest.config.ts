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
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'scripts/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/',
      'vue-mri-ui-lib/',
      'tests/e2e/**',
      'scripts/__tests__/**',  // TODO: Fix vitest es-module handling in node environment
    ],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },
    pool: 'forks',
    testTimeout: 30000,
    hookTimeout: 30000,
    server: {
      deps: {
        inline: ['vuetify'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      clean: false,
      // Include all src/ files for coverage
      include: ['src/**/*.{ts,vue}'],
      // Documented exclusions with justifications
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        // Type declarations only - no runtime code
        '**/*.types.ts',
        '**/types.ts',
        '**/*.d.ts',
        // Chart data interfaces only - no runtime code (like *.types.ts)
        'src/ui/chart-types.ts',
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
        // Histoire story files - dev-time visual docs, not runtime code
        'src/components/ui/**/*.story.vue',
      ],
      thresholds: {
        lines: 91,
        statements: 91,
        branches: 86,
        functions: 77,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
