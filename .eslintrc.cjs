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
  ],
}
