/* eslint-env node */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
  },
  plugins: ['vue', '@typescript-eslint', 'unused-imports'],
  rules: {
    // Vue-specific adjustments
    'vue/valid-v-slot': ['error', { allowModifiers: true }],

    // Catch stray console/debugger (logger.ts has eslint-disable)
    'no-console': 'warn',
    'no-debugger': 'warn',

    // Unused imports plugin (better handling than default no-unused-vars)
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'warn',
    'unused-imports/no-unused-vars': [
      'warn',
      { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
    ],

    // TypeScript handles these better
    'no-undef': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',

    // Allow flexibility in Vue component organization
    'vue/component-api-style': 'off',
    'vue/one-component-per-file': 'off',

    // Atlas UI library — Phase 1 + 2 wrappers shipped, severity at 'warn'.
    // Uses vue/no-restricted-html-elements (NOT no-restricted-component-names) because
    // Vuetify components are globally auto-imported via vite-plugin-vuetify and appear
    // in templates as elements, not as locally-registered component names.
    // Names without a corresponding Atlas* wrapper yet are NOT listed (they get added
    // back as their wrappers ship): v-card (no semantic gap — AtlasCard exists but is
    // a styled composite, not a 1:1 v-card replacement), v-data-table (Phase 4).
    // Existing raw-Vuetify callsites surface as warnings; CI does not fail on warnings —
    // migration is opportunistic.
    'vue/no-restricted-html-elements': ['warn',
      { element: 'v-btn',          message: 'Use <AtlasButton> from @/components/ui' },
      { element: 'v-text-field',   message: 'Use <AtlasTextField> from @/components/ui' },
      { element: 'v-select',       message: 'Use <AtlasSelect> from @/components/ui' },
      { element: 'v-autocomplete', message: 'Use <AtlasAutocomplete> from @/components/ui' },
      { element: 'v-checkbox',     message: 'Use <AtlasCheckbox> from @/components/ui' },
      { element: 'v-switch',       message: 'Use <AtlasSwitch> from @/components/ui' },
      { element: 'v-radio',        message: 'Use <AtlasRadio> from @/components/ui' },
      { element: 'v-radio-group',  message: 'Use <AtlasRadioGroup> from @/components/ui' },
      { element: 'v-chip',         message: 'Use <AtlasChip> from @/components/ui' },
      { element: 'v-dialog',       message: 'Use <AtlasDialog> from @/components/ui' },
      { element: 'v-alert',        message: 'Use <AtlasAlert> from @/components/ui' },
      { element: 'v-snackbar',     message: 'Use <AtlasSnackbar> from @/components/ui' },
      { element: 'v-data-table',   message: 'Use <AtlasDataTable> from @/components/ui' },
      // Tier B canonical wrappers — added as a regression guard. After Sweep 1
      // there should be near-zero raw usages of these in the codebase.
      { element: 'v-tooltip',           message: 'Use <AtlasTooltip> from @/components/ui' },
      { element: 'v-menu',              message: 'Use <AtlasMenu> from @/components/ui' },
      { element: 'v-tabs',              message: 'Use <AtlasTabs> from @/components/ui' },
      { element: 'v-tab',               message: 'Use <AtlasTab> from @/components/ui' },
      { element: 'v-list',              message: 'Use <AtlasList> from @/components/ui' },
      { element: 'v-list-item',         message: 'Use <AtlasListItem> from @/components/ui' },
      { element: 'v-divider',           message: 'Use <AtlasDivider> from @/components/ui' },
      { element: 'v-progress-linear',   message: 'Use <AtlasProgressLinear> from @/components/ui' },
      { element: 'v-progress-circular', message: 'Use <AtlasProgressCircular> from @/components/ui' },
      { element: 'v-skeleton-loader',   message: 'Use <AtlasSkeleton> from @/components/ui' },
      { element: 'v-pagination',        message: 'Use <AtlasPagination> from @/components/ui' },
      { element: 'v-avatar',            message: 'Use <AtlasAvatar> from @/components/ui' },
      { element: 'v-badge',             message: 'Use <AtlasBadge> from @/components/ui' },
      { element: 'v-banner',            message: 'Use <AtlasBanner> from @/components/ui' },
      { element: 'v-spacer',            message: 'Use <AtlasSpacer> from @/components/ui' },
      { element: 'v-row',               message: 'Use <AtlasRow> from @/components/ui' },
      { element: 'v-col',               message: 'Use <AtlasCol> from @/components/ui' },
      { element: 'v-container',         message: 'Use <AtlasContainer> from @/components/ui' },
      { element: 'v-icon',              message: 'Use <AtlasIcon> from @/components/ui' },
    ],

    'no-restricted-imports': ['off', {
      patterns: [{
        group: ['@/components/ui/*', '!@/components/ui/index'],
        message: 'Import Atlas* components from @/components/ui (the barrel), not deep paths',
      }],
    }],
  },
  overrides: [
    {
      // Allow console in tests, scripts, and dev plugins
      files: ['tests/**/*', 'scripts/**/*', 'plugins-dev/**/*'],
      rules: {
        'no-console': 'off',
        // Allow any in tests for mocking purposes
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['src/components/ui/**/*.{vue,ts}'],
      rules: {
        'vue/no-restricted-html-elements': 'off',
        'no-restricted-imports': 'off',
      },
    },
  ],
}
