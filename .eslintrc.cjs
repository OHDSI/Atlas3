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

    // Atlas UI library — wrappers exist but lint is parked at 'off' until Phase 1.
    // Severity is intentionally 'off' so the rule shape is reviewed and version-controlled
    // without yet failing CI on the existing 152 raw-Vuetify callsites.
    'vue/no-restricted-component-names': ['off', {
      'v-btn':          { message: 'Use <AtlasButton> from @/components/ui' },
      'v-text-field':   { message: 'Use <AtlasTextField> from @/components/ui' },
      'v-select':       { message: 'Use <AtlasSelect> from @/components/ui' },
      'v-autocomplete': { message: 'Use <AtlasAutocomplete> from @/components/ui' },
      'v-checkbox':     { message: 'Use <AtlasCheckbox> from @/components/ui' },
      'v-switch':       { message: 'Use <AtlasSwitch> from @/components/ui' },
      'v-radio':        { message: 'Use <AtlasRadio> from @/components/ui' },
      'v-radio-group':  { message: 'Use <AtlasRadioGroup> from @/components/ui' },
      'v-chip':         { message: 'Use <AtlasChip> from @/components/ui' },
      'v-dialog':       { message: 'Use <AtlasDialog> from @/components/ui' },
      'v-card':         { message: 'Use <AtlasCard> from @/components/ui' },
      'v-alert':        { message: 'Use <AtlasAlert> from @/components/ui' },
      'v-snackbar':     { message: 'Use <AtlasSnackbar> from @/components/ui' },
      'v-data-table':   { message: 'Use <AtlasDataTable> from @/components/ui' },
    }],

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
        'vue/no-restricted-component-names': 'off',
        'no-restricted-imports': 'off',
      },
    },
  ],
}
