/* eslint-env node */
module.exports = {
  root: true,
  // package.json's `lint` script passes --ignore-path .gitignore. Files
  // listed here are *additionally* ignored — needed for `public/vendor/`,
  // which is third-party (SystemJS, Vue, vue-router globals) committed
  // to ship as static assets but should not be linted.
  ignorePatterns: ['public/vendor/**'],
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vuejs-accessibility/recommended',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
  },
  plugins: ['vue', '@typescript-eslint', 'unused-imports', 'vuejs-accessibility'],
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

    // Allow mutations on props when using shared reactive objects (Pinia stores).
    // With modern Vue 3 + Pinia, direct mutations on object references passed as props
    // are idiomatic and reactive. The strict no-mutating-props rule conflicts with
    // this pattern, so we disable it completely.
    'vue/no-mutating-props': 'off',

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

    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/services/webapi', '@/services/webapi.ts'],
        message: 'webapi.ts was split by domain — import from the specific service (cohort-definition, report, pathway, incidence-rate, concept-search, source, …)',
      }],
    }],
  },
  overrides: [
    {
      // cohort-editor uses intentional design patterns that conflict with several
      // generic lint rules:
      //
      // no-side-effects-in-computed-properties — computed getters that lazy-init
      //   sparse model arrays/objects (e.g. `innerCriteria` in CorelatedCriteria)
      //   are intentional document-mutation patterns; same rationale as the global
      //   vue/no-mutating-props: 'off'.
      //
      // no-explicit-any — generic field-binding utilities (bindings.ts,
      //   criteria-editor-helper.ts) and per-domain computed accessors use
      //   Record<string, any> to work across the Criteria discriminated union.
      //   Zod at the API boundary is the real safety layer; converting to `unknown`
      //   would require 30+ casts with no meaningful gain.
      //
      // multi-word-component-names — OMOP/circe domain names (Death, Measurement,
      //   Observation, Window, Period) mirror the Java model exactly; renaming
      //   would misalign with the domain model.
      //
      // no-autofocus — autofocus on popover/inline-edit text fields is correct UX
      //   (WCAG dialog interaction pattern). The rule targets page-load hijacking.
      files: ['src/components/cohort-editor/**/*.{vue,ts}'],
      rules: {
        'vue/no-side-effects-in-computed-properties': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'vue/multi-word-component-names': 'off',
        'vuejs-accessibility/no-autofocus': 'off',
      },
    },
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
      // Plugins are loaded as single-spa parcels with their own Vuetify
      // and bundle. They can't import the host's Atlas* wrappers from
      // @/components/ui across the parcel boundary, so they use raw
      // Vuetify elements directly. The chat panel renders sanitised
      // markdown via DOMPurify, so v-html is intentional and safe.
      files: ['plugins-dev/**/*.{vue,ts,tsx}'],
      rules: {
        'vue/no-restricted-html-elements': 'off',
        'vue/no-v-html': 'off',
      },
    },
    {
      files: ['src/components/ui/**/*.{vue,ts}'],
      rules: {
        'vue/no-restricted-html-elements': 'off',
        'no-restricted-imports': 'off',
        // Histoire story files are named after their subject (e.g. Tokens.story.vue,
        // Introduction.story.vue). The `.story` suffix is not counted as a word, so
        // single-word subjects trip vue/multi-word-component-names. Stories are not
        // shipped components, so this rule is not meaningful here.
        'vue/multi-word-component-names': 'off',
      },
    },
  ],
}
