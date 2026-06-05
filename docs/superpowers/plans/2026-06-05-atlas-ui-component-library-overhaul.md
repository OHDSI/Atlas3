# Atlas-UI Component Library Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dark-mode support to the `atlas-ui` component library, overhaul the Histoire docs (per-component docs, branded chrome, dark toggle), and give plugin developers a native-looking, dark-capable starter + guide.

**Architecture:** A single token source (`src/ui/tokens.ts`) drives both light and dark. `colorDark` is added alongside the existing `color` set; `build-tokens.ts` emits `:root, .v-theme--light { … }` and `.v-theme--dark { … }` CSS-variable blocks; `theme.ts` adds a `dark` Vuetify theme. Components already consume `rgb(var(--v-theme-*))` semantic vars, so they adapt to the active Vuetify theme automatically. Histoire gets a global theme decorator + toolbar toggle, branded chrome, and per-component documentation via a shared `AtlasStoryDocs.vue` helper.

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), Vuetify 3, Histoire 0.17 (`@histoire/plugin-vue`), Vite, Vitest, Playwright, TypeScript (strict), single-spa (plugins).

**Branch:** `feat/atlas-ui-overhaul` (already created; spec committed).

**Conventions to follow:**
- Run a single Vitest file: `NODE_OPTIONS='--max-old-space-size=12288' npx vitest run <path>`
- Keep `npm run tokens:check` green (generated CSS must match source).
- Commit after each task. Pre-commit runs eslint `--fix` (husky); expect it to run on commit.
- Final gate per phase: `npm run type-check && npm run lint && npm run test:unit`.

**Indicative True Dark palette (finalize/verify WCAG AA contrast during Task 1):**

| Token | Dark value |
|---|---|
| primary | `#6aa3cb` |
| primaryDarken | `#4f86ad` |
| accent | `#eb6622` |
| surface | `#161618` |
| surfaceVariant | `#0a0a0b` |
| onSurface | `#f4f4f5` |
| onSurfaceVariant | `#a1a1aa` |
| outline | `rgba(255,255,255,.14)` |
| outlineVariant | `rgba(255,255,255,.07)` |
| info | `#4aa3f0` |
| success | `#5cc16a` |
| warning | `#ffa726` |
| danger | `#ff6b6b` |

---

## Phase 1 — Dark-mode foundation (tokens + theme)

### Task 1: Add dark color tokens

**Files:**
- Modify: `src/ui/tokens.ts`
- Test: `tests/unit/ui/tokens.spec.ts`

- [ ] **Step 1: Write the failing test** — append to `tests/unit/ui/tokens.spec.ts` inside the `describe('design tokens', …)` block:

```ts
  it('exposes a dark color set with True Dark surfaces and lightened primary', () => {
    expect(tokens.colorDark.primary).toBe('#6aa3cb')
    expect(tokens.colorDark.primaryDarken).toBe('#4f86ad')
    expect(tokens.colorDark.accent).toBe('#eb6622')
    expect(tokens.colorDark.surface).toBe('#161618')
    expect(tokens.colorDark.surfaceVariant).toBe('#0a0a0b')
    expect(tokens.colorDark.onSurface).toBe('#f4f4f5')
    expect(tokens.colorDark.onSurfaceVariant).toBe('#a1a1aa')
    expect(tokens.colorDark.outline).toBe('rgba(255,255,255,.14)')
    expect(tokens.colorDark.outlineVariant).toBe('rgba(255,255,255,.07)')
    expect(tokens.colorDark.info).toBe('#4aa3f0')
    expect(tokens.colorDark.success).toBe('#5cc16a')
    expect(tokens.colorDark.warning).toBe('#ffa726')
    expect(tokens.colorDark.danger).toBe('#ff6b6b')
  })

  it('keeps dark color keys in sync with light color keys', () => {
    expect(Object.keys(tokens.colorDark).sort()).toEqual(Object.keys(tokens.color).sort())
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `NODE_OPTIONS='--max-old-space-size=12288' npx vitest run tests/unit/ui/tokens.spec.ts`
Expected: FAIL — `tokens.colorDark` is undefined.

- [ ] **Step 3: Implement** — in `src/ui/tokens.ts`, add a `colorDark` key to the `tokens` object, immediately after the `color: { … }` block (same keys, dark values):

```ts
  colorDark: {
    primary:        '#6aa3cb',
    primaryDarken:  '#4f86ad',
    accent:         '#eb6622',
    surface:        '#161618',
    surfaceVariant: '#0a0a0b',
    onSurface:        '#f4f4f5',
    onSurfaceVariant: '#a1a1aa',
    outline:        'rgba(255,255,255,.14)',
    outlineVariant: 'rgba(255,255,255,.07)',
    info:    '#4aa3f0',
    success: '#5cc16a',
    warning: '#ffa726',
    danger:  '#ff6b6b',
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `NODE_OPTIONS='--max-old-space-size=12288' npx vitest run tests/unit/ui/tokens.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/tokens.ts tests/unit/ui/tokens.spec.ts
git commit -m "feat(atlas-ui): add dark color token set (True Dark palette)"
```

---

### Task 2: Emit light/dark CSS-variable blocks

**Files:**
- Modify: `src/ui/build-tokens.ts`
- Modify: `src/ui/tokens.css` (regenerated, do not hand-edit)
- Test: `tests/unit/ui/build-tokens.spec.ts`

- [ ] **Step 1: Write the failing test** — replace the `it('emits a :root block', …)` test in `tests/unit/ui/build-tokens.spec.ts` and add new ones:

```ts
  it('emits a :root, .v-theme--light block for light colors + shared tokens', () => {
    expect(css).toMatch(/:root,\s*\.v-theme--light\s*\{/)
    expect(css).toContain('--atlas-color-primary: #1f425a;')
    expect(css).toContain('--atlas-radius-md: 8px;')
  })

  it('emits a .v-theme--dark block overriding only color tokens', () => {
    expect(css).toMatch(/\.v-theme--dark\s*\{/)
    const darkBlock = css.slice(css.indexOf('.v-theme--dark'))
    expect(darkBlock).toContain('--atlas-color-primary: #6aa3cb;')
    expect(darkBlock).toContain('--atlas-color-surface: #161618;')
    // shared (non-color) tokens are NOT repeated in the dark block
    expect(darkBlock).not.toContain('--atlas-radius-md')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `NODE_OPTIONS='--max-old-space-size=12288' npx vitest run tests/unit/ui/build-tokens.spec.ts`
Expected: FAIL — output still emits a single `:root {` block.

- [ ] **Step 3: Implement** — replace the body of `generateTokensCss` in `src/ui/build-tokens.ts`:

```ts
export function generateTokensCss(t: AtlasTokens): string {
  const lightColor: string[] = []
  const darkColor: string[] = []
  const shared: string[] = []

  for (const [group, values] of Object.entries(t)) {
    if (group === 'color' || group === 'colorDark') {
      const target = group === 'color' ? lightColor : darkColor
      for (const [key, value] of Object.entries(values as Record<string, string>)) {
        target.push(`  --atlas-color-${camelToKebab(key)}: ${value};`)
      }
    } else {
      for (const [key, value] of Object.entries(values as Record<string, string | number>)) {
        shared.push(`  --atlas-${camelToKebab(group)}-${camelToKebab(key)}: ${value};`)
      }
    }
  }

  return [
    HEADER,
    `:root, .v-theme--light {`,
    [...lightColor, ...shared].join('\n'),
    `}`,
    `.v-theme--dark {`,
    darkColor.join('\n'),
    `}`,
    '',
  ].join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `NODE_OPTIONS='--max-old-space-size=12288' npx vitest run tests/unit/ui/build-tokens.spec.ts`
Expected: PASS.

- [ ] **Step 5: Regenerate the CSS and verify it is in sync**

Run: `npm run tokens:build && npm run tokens:check`
Expected: `tokens.css` rewritten with both blocks; `tokens:check` exits 0 (no diff).

- [ ] **Step 6: Commit**

```bash
git add src/ui/build-tokens.ts src/ui/tokens.css tests/unit/ui/build-tokens.spec.ts
git commit -m "feat(atlas-ui): emit light/dark theme CSS-variable blocks"
```

---

### Task 3: Add the dark Vuetify theme

**Files:**
- Modify: `src/ui/theme.ts`
- Test: `tests/unit/ui/theme.spec.ts`

- [ ] **Step 1: Write the failing test** — append to `tests/unit/ui/theme.spec.ts`:

```ts
  it('defines a dark theme bound to the dark token set', () => {
    const opts = buildVuetifyOptions()
    const dark = opts.theme!.themes!.dark!.colors!
    expect(dark.primary).toBe(tokens.colorDark.primary)
    expect(dark.surface).toBe(tokens.colorDark.surface)
    expect(dark['on-surface']).toBe(tokens.colorDark.onSurface)
    expect(dark.error).toBe(tokens.colorDark.danger)
    expect(dark.orange).toBe(tokens.colorDark.accent)
    expect(dark.outline).toBe(tokens.colorDark.outline)
  })

  it('marks the dark theme as dark for Vuetify', () => {
    const opts = buildVuetifyOptions()
    expect(opts.theme!.themes!.dark!.dark).toBe(true)
  })

  it('applies a primary override to both light and dark', () => {
    const opts = buildVuetifyOptions('#000000')
    expect(opts.theme!.themes!.light!.colors!.primary).toBe('#000000')
    expect(opts.theme!.themes!.dark!.colors!.primary).toBe('#000000')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `NODE_OPTIONS='--max-old-space-size=12288' npx vitest run tests/unit/ui/theme.spec.ts`
Expected: FAIL — `themes.dark` is undefined.

- [ ] **Step 3: Implement** — in `src/ui/theme.ts`, extract a color-mapping helper and build both themes. Replace the `theme` block returned by `buildVuetifyOptions`:

```ts
type ColorSet = typeof tokens.color

function colorsFor(set: ColorSet, primaryOverride?: string | null) {
  return {
    primary: primaryOverride || set.primary,
    'primary-darken-1': set.primaryDarken,
    secondary: '#424242',
    accent: '#2d5f7f',
    error: set.danger,
    info: set.info,
    success: set.success,
    warning: set.warning,
    orange: set.accent,
    background: set.surfaceVariant,
    surface: set.surface,
    'surface-variant': set.surfaceVariant,
    'on-surface': set.onSurface,
    'on-surface-variant': set.onSurfaceVariant,
    outline: set.outline,
    'outline-variant': set.outlineVariant,
  }
}
```

Then in the returned object set:

```ts
    theme: {
      defaultTheme: 'light',
      themes: {
        light: { colors: colorsFor(tokens.color, primaryOverride) },
        dark: { dark: true, colors: colorsFor(tokens.colorDark, primaryOverride) },
      },
    },
```

(Leave the `defaults` block unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `NODE_OPTIONS='--max-old-space-size=12288' npx vitest run tests/unit/ui/theme.spec.ts`
Expected: PASS (including the existing light-theme tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/theme.ts tests/unit/ui/theme.spec.ts
git commit -m "feat(atlas-ui): add dark Vuetify theme bound to dark tokens"
```

---

### Task 4: Tokenize the AtlasCard hover shadow

**Files:**
- Modify: `src/ui/tokens.ts`
- Modify: `src/ui/build-tokens.ts` (no change needed — `elevation` is already emitted generically)
- Modify: `src/ui/tokens.css` (regenerated)
- Modify: `src/components/ui/AtlasCard.vue:52-57`
- Test: `tests/unit/ui/tokens.spec.ts`

- [ ] **Step 1: Write the failing test** — append to `tests/unit/ui/tokens.spec.ts`:

```ts
  it('exposes a hover elevation token', () => {
    expect(tokens.elevation.hover).toBe('0 2px 6px rgba(15,23,42,.1), 0 12px 32px rgba(15,23,42,.12)')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `NODE_OPTIONS='--max-old-space-size=12288' npx vitest run tests/unit/ui/tokens.spec.ts`
Expected: FAIL — `tokens.elevation.hover` undefined.

- [ ] **Step 3: Implement** — in `src/ui/tokens.ts`, extend the `elevation` object:

```ts
  elevation: {
    ambient: '0 1px 3px rgba(15,23,42,.08)',
    diffuse: '0 8px 24px rgba(15,23,42,.08)',
    hover:   '0 2px 6px rgba(15,23,42,.1), 0 12px 32px rgba(15,23,42,.12)',
  },
```

Then replace the hardcoded hover shadow in `src/components/ui/AtlasCard.vue`:

```css
.atlas-card--interactive:hover {
  box-shadow: var(--atlas-elevation-hover);
  transform: translateY(-2px);
}
```

- [ ] **Step 4: Regenerate CSS, run tests**

Run: `npm run tokens:build && npm run tokens:check && NODE_OPTIONS='--max-old-space-size=12288' npx vitest run tests/unit/ui/tokens.spec.ts`
Expected: tokens.css contains `--atlas-elevation-hover:`; `tokens:check` exits 0; tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/tokens.ts src/ui/tokens.css src/components/ui/AtlasCard.vue tests/unit/ui/tokens.spec.ts
git commit -m "refactor(atlas-ui): tokenize AtlasCard hover shadow"
```

---

### Task 5: Phase 1 gate

- [ ] **Step 1: Run the full check suite**

Run: `npm run type-check && npm run lint && npm run test:unit -- run`
Expected: all green.

- [ ] **Step 2: Build the library to confirm tokens flow through**

Run: `npm run lib:build`
Expected: `packages/atlas-ui/dist/atlas-ui.css` contains both `.v-theme--light` and `.v-theme--dark` blocks.

---

## Phase 2 — Histoire theming, dark toggle & branded chrome

### Task 6: Global theme decorator + dark toggle

**Files:**
- Create: `src/components/ui/_story/StoryThemeProvider.vue`
- Modify: `histoire.setup.ts`

**Background:** Histoire renders each story in an isolated app created by `setupVue3`. We wrap every story in a provider that (a) applies the Vuetify theme to a full-bleed surface and (b) exposes a light/dark toggle button. The toggle calls Vuetify's `useTheme().change()`.

- [ ] **Step 1: Create the provider component** `src/components/ui/_story/StoryThemeProvider.vue`:

```vue
<template>
  <v-theme-provider :theme="theme" with-background style="min-height: 100%;">
    <div style="position: relative; padding: 24px;">
      <button
        type="button"
        class="story-theme-toggle"
        :aria-pressed="theme === 'dark'"
        @click="theme = theme === 'dark' ? 'light' : 'dark'"
      >
        {{ theme === 'dark' ? '☾ Dark' : '☀ Light' }}
      </button>
      <slot />
    </div>
  </v-theme-provider>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const theme = ref<'light' | 'dark'>('light')
</script>

<style scoped>
.story-theme-toggle {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: var(--atlas-radius-md);
  border: 1px solid rgb(var(--v-theme-outline));
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
}
</style>
```

- [ ] **Step 2: Register it globally** in `histoire.setup.ts` so every story is wrapped. Replace the file body with:

```ts
import 'vuetify/styles'
import '@/ui/tokens.css'
import { defineSetupVue3 } from '@histoire/plugin-vue'
import { createVuetifyInstance } from '@/plugins/vuetify'
import StoryThemeProvider from '@/components/ui/_story/StoryThemeProvider.vue'

export const setupVue3 = defineSetupVue3(({ app, addWrapper }) => {
  app.use(createVuetifyInstance())
  app.component('StoryThemeProvider', StoryThemeProvider)
  addWrapper(StoryThemeProvider)
})
```

> Note: `addWrapper` wraps every story's content with the component. Confirm `createVuetifyInstance()` registers the themes from `buildVuetifyOptions` (it should, since the app uses it). If `addWrapper` is unavailable in this Histoire version, fall back to wrapping each `<Story>` content manually with `<StoryThemeProvider>` (registered globally above).

- [ ] **Step 3: Verify in the dev server**

Run: `npm run ui:dev` (then open the printed URL). Open `AtlasButton` → click the toggle.
Expected: the canvas surface and components switch between light and True Dark; buttons/cards/text remain legible in dark.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/_story/StoryThemeProvider.vue histoire.setup.ts
git commit -m "feat(histoire): global theme provider with light/dark toggle"
```

---

### Task 7: Brand the Histoire site chrome

**Files:**
- Modify: `histoire.config.ts`
- Create: `src/components/ui/_story/histoire.css`

- [ ] **Step 1: Add theme + custom CSS to the config.** In `histoire.config.ts`, add to the `defineConfig({ … })` object (alongside the existing keys):

```ts
  theme: {
    title: 'Atlas UI',
    colors: {
      primary: {
        50: '#eaf1f6', 100: '#cdddea', 200: '#a9c4d8', 300: '#84abc6',
        400: '#6aa3cb', 500: '#1f425a', 600: '#1b3a50', 700: '#163349',
        800: '#112839', 900: '#0c1d2a',
      },
    },
    logo: {
      square: './public/atlas-logo.svg',
      light: './public/atlas-logo.svg',
      dark: './public/atlas-logo.svg',
    },
  },
  setupCode: [],
```

> If `./public/atlas-logo.svg` does not exist, point `logo` at an existing asset under `public/` (run `ls public/`) or omit the `logo` block. The `primary` ramp drives Histoire's own sidebar/header accent.

- [ ] **Step 2: Add accent CSS for the chrome** — create `src/components/ui/_story/histoire.css`:

```css
/* Histoire chrome accents to match Atlas brand. */
:root {
  --histoire-color-primary: #1f425a;
}
.htw-dark, html.dark {
  --histoire-color-primary: #6aa3cb;
}
```

Wire it via Histoire's global CSS option — add to `histoire.config.ts` inside the config object:

```ts
  setupFile: './histoire.setup.ts',
```

(already present) and add at the top-level config:

```ts
  vite: {
    base: '/Atlas3/',
    css: { /* keep defaults */ },
    resolve: {
      alias: { '@': new URL('./src', import.meta.url).pathname },
    },
  },
```

Import the chrome CSS from `histoire.setup.ts` (it is loaded into the preview app); add near the other imports:

```ts
import '@/components/ui/_story/histoire.css'
```

- [ ] **Step 3: Verify**

Run: `npm run ui:dev`
Expected: sidebar/header use Atlas navy (light) / lightened navy (dark); title reads "Atlas UI"; logo shows if asset present.

- [ ] **Step 4: Commit**

```bash
git add histoire.config.ts src/components/ui/_story/histoire.css histoire.setup.ts
git commit -m "feat(histoire): brand site chrome with Atlas identity"
```

---

### Task 8: Dark-mode visual regression coverage

**Files:**
- Modify: `tests/e2e/visual-comparison.spec.ts`

- [ ] **Step 1: Inspect the existing spec** to match its helper/screenshot conventions.

Run: `sed -n '1,60p' tests/e2e/visual-comparison.spec.ts`

- [ ] **Step 2: Add a dark-mode snapshot** following the file's existing pattern. Add a test that navigates to a representative page (or Histoire story canvas) with the dark theme active and captures a snapshot named `*-dark`. Use the same `expect(page).toHaveScreenshot()` style already used in the file (do not invent a new helper). Example shape (adapt selectors to the file's conventions):

```ts
test('AtlasCard renders in dark mode', async ({ page }) => {
  await page.goto('/') // adapt to the file's base URL / story URL convention
  // toggle the StoryThemeProvider button or set the dark theme, then:
  await expect(page).toHaveScreenshot('atlas-card-dark.png', { maxDiffPixelRatio: 0.02 })
})
```

- [ ] **Step 3: Generate baselines**

Run: `npx playwright test tests/e2e/visual-comparison.spec.ts --update-snapshots`
Expected: new `-dark` baseline PNGs created under the spec's snapshot folder.

- [ ] **Step 4: Re-run to confirm stable**

Run: `npx playwright test tests/e2e/visual-comparison.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/visual-comparison.spec.ts tests/**/**-dark*.png
git commit -m "test(atlas-ui): dark-mode visual regression baselines"
```

---

## Phase 3 — Documentation content

### Task 9: Shared `AtlasStoryDocs` documentation helper

**Files:**
- Create: `src/components/ui/_story/AtlasStoryDocs.vue`
- Test: `tests/component/ui/AtlasStoryDocs.spec.ts`

**Purpose:** A single component that renders a consistent doc block (title, description, props table, events, slots, usage code, do/don't) at the top of each story. Driven by a typed prop object so every component documents the same way.

- [ ] **Step 1: Write the failing test** `tests/component/ui/AtlasStoryDocs.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AtlasStoryDocs from '@/components/ui/_story/AtlasStoryDocs.vue'

describe('AtlasStoryDocs', () => {
  it('renders the component name, description, and a props row', () => {
    const wrapper = mount(AtlasStoryDocs, {
      props: {
        name: 'AtlasButton',
        description: 'Primary action button.',
        props: [{ name: 'variant', type: 'string', default: 'primary', description: 'Visual style.' }],
        events: [{ name: 'click', payload: 'MouseEvent', description: 'Fired on click.' }],
        slots: [{ name: 'default', description: 'Button label.' }],
        usage: '<AtlasButton variant="primary">Save</AtlasButton>',
      },
    })
    expect(wrapper.text()).toContain('AtlasButton')
    expect(wrapper.text()).toContain('Primary action button.')
    expect(wrapper.text()).toContain('variant')
    expect(wrapper.text()).toContain('click')
    expect(wrapper.text()).toContain('default')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `NODE_OPTIONS='--max-old-space-size=12288' npx vitest run tests/component/ui/AtlasStoryDocs.spec.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement** `src/components/ui/_story/AtlasStoryDocs.vue`:

```vue
<template>
  <section class="atlas-docs">
    <h2 class="atlas-docs__title">{{ name }}</h2>
    <p class="atlas-docs__desc">{{ description }}</p>

    <template v-if="props?.length">
      <h3>Props</h3>
      <table class="atlas-docs__table">
        <thead><tr><th>Name</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr v-for="p in props" :key="p.name">
            <td><code>{{ p.name }}</code></td><td><code>{{ p.type }}</code></td>
            <td><code>{{ p.default ?? '—' }}</code></td><td>{{ p.description }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-if="events?.length">
      <h3>Events</h3>
      <table class="atlas-docs__table">
        <thead><tr><th>Name</th><th>Payload</th><th>Description</th></tr></thead>
        <tbody>
          <tr v-for="e in events" :key="e.name">
            <td><code>{{ e.name }}</code></td><td><code>{{ e.payload ?? '—' }}</code></td><td>{{ e.description }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-if="slots?.length">
      <h3>Slots</h3>
      <table class="atlas-docs__table">
        <thead><tr><th>Name</th><th>Description</th></tr></thead>
        <tbody>
          <tr v-for="s in slots" :key="s.name"><td><code>{{ s.name }}</code></td><td>{{ s.description }}</td></tr>
        </tbody>
      </table>
    </template>

    <template v-if="usage">
      <h3>Usage</h3>
      <pre class="atlas-docs__code"><code>{{ usage }}</code></pre>
    </template>

    <div v-if="dos?.length || donts?.length" class="atlas-docs__guidance">
      <div v-if="dos?.length"><h4>✓ Do</h4><ul><li v-for="d in dos" :key="d">{{ d }}</li></ul></div>
      <div v-if="donts?.length"><h4>✗ Don't</h4><ul><li v-for="d in donts" :key="d">{{ d }}</li></ul></div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface PropDoc { name: string; type: string; default?: string; description: string }
interface EventDoc { name: string; payload?: string; description: string }
interface SlotDoc { name: string; description: string }

defineProps<{
  name: string
  description: string
  props?: PropDoc[]
  events?: EventDoc[]
  slots?: SlotDoc[]
  usage?: string
  dos?: string[]
  donts?: string[]
}>()
</script>

<style scoped>
.atlas-docs { color: rgb(var(--v-theme-on-surface)); max-width: 880px; }
.atlas-docs__title { margin: 0 0 4px; }
.atlas-docs__desc { color: rgb(var(--v-theme-on-surface-variant)); margin: 0 0 16px; }
.atlas-docs__table { width: 100%; border-collapse: collapse; margin: 8px 0 20px; font-size: 13px; }
.atlas-docs__table th, .atlas-docs__table td { text-align: left; padding: 6px 10px; border-bottom: 1px solid rgb(var(--v-theme-outline)); }
.atlas-docs__code { background: rgb(var(--v-theme-surface-variant)); padding: 12px; border-radius: var(--atlas-radius-md); overflow-x: auto; }
.atlas-docs__guidance { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `NODE_OPTIONS='--max-old-space-size=12288' npx vitest run tests/component/ui/AtlasStoryDocs.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/_story/AtlasStoryDocs.vue tests/component/ui/AtlasStoryDocs.spec.ts
git commit -m "feat(histoire): shared AtlasStoryDocs documentation helper"
```

---

### Task 10: Worked Tier-A docs example (AtlasButton)

**Files:**
- Modify: `src/components/ui/AtlasButton.story.vue`

- [ ] **Step 1: Add an "Overview" docs variant** at the top of the `<Story>` in `AtlasButton.story.vue`, importing the helper:

```vue
<script setup lang="ts">
import AtlasButton from './AtlasButton.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>
```

Add as the first `<Variant>`:

```vue
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasButton"
        description="Brand-styled action button wrapping Vuetify's VBtn with semantic variants, sizes, tones, loading and icon support."
        :props="[
          { name: 'variant', type: `'primary'|'secondary'|'tonal'|'danger'|'ghost'|'link'`, default: 'primary', description: 'Visual style.' },
          { name: 'size', type: `'xs'|'sm'|'md'|'lg'`, default: 'md', description: 'Button size.' },
          { name: 'tone', type: `'primary'|'neutral'|'warning'|'danger'|'success'|'info'`, default: 'undefined', description: 'Overrides color independent of variant.' },
          { name: 'loading', type: 'boolean', default: 'false', description: 'Shows a spinner and disables interaction.' },
          { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the button.' },
          { name: 'icon', type: 'string', default: 'undefined', description: 'MDI icon name.' },
          { name: 'iconPosition', type: `'start'|'end'`, default: 'start', description: 'Icon side.' },
          { name: 'type', type: `'button'|'submit'|'reset'`, default: 'button', description: 'Native button type.' },
        ]"
        :events="[{ name: 'click', payload: 'MouseEvent', description: 'Emitted when the button is activated.' }]"
        :slots="[{ name: 'default', description: 'Button label content.' }]"
        usage="<AtlasButton variant=&quot;primary&quot; icon=&quot;mdi-plus&quot;>Add</AtlasButton>"
        :dos="['Use one primary button per view for the main action.', 'Use danger only for destructive actions.']"
        :donts="[`Don't use link variant for primary actions.`, `Don't pack more than ~3 buttons in a row.`]"
      />
    </Variant>
```

- [ ] **Step 2: Verify it renders in dev**

Run: `npm run ui:dev` → open `AtlasButton` → "Overview".
Expected: doc block with props/events/slots tables, usage, do/don't; legible in light and dark.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/AtlasButton.story.vue
git commit -m "docs(atlas-ui): document AtlasButton (Tier-A pattern)"
```

---

### Task 11: Worked Tier-B individual story (AtlasBadge)

**Files:**
- Create: `src/components/ui/AtlasBadge.story.vue`
- Modify: `src/components/ui/_TierB.story.vue` (remove AtlasBadge from the combined smoke story)

- [ ] **Step 1: Create** `src/components/ui/AtlasBadge.story.vue`:

```vue
<script setup lang="ts">
import AtlasBadge from './AtlasBadge.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story title="AtlasBadge" group="tier-b">
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasBadge"
        description="Thin wrapper over Vuetify's VBadge. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: '…VBadge props', type: 'see Vuetify VBadge', default: '—', description: 'All VBadge props are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'The element the badge is attached to.' }, { name: 'badge', description: 'Custom badge content.' }]"
        usage="<AtlasBadge :content=&quot;3&quot; color=&quot;error&quot;><AtlasIcon icon=&quot;mdi-bell&quot; /></AtlasBadge>"
      />
    </Variant>

    <Variant title="default">
      <AtlasBadge content="3" color="error">
        <span style="padding:8px 12px;">Inbox</span>
      </AtlasBadge>
    </Variant>
  </Story>
</template>
```

- [ ] **Step 2: Remove AtlasBadge from the combined smoke story** in `src/components/ui/_TierB.story.vue` (delete its import and its usage in the template so it is not documented twice).

- [ ] **Step 3: Verify**

Run: `npm run ui:dev`
Expected: `AtlasBadge` appears as its own entry under Tier B with an Overview; `_TierB` smoke story still renders without it.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/AtlasBadge.story.vue src/components/ui/_TierB.story.vue
git commit -m "docs(atlas-ui): promote AtlasBadge to its own documented story"
```

---

### Task 12: Document the remaining components

Apply the **Task 10 pattern** (add an "Overview" `AtlasStoryDocs` variant to the existing story) for each Tier-A component, and the **Task 11 pattern** (create an individual story + remove from `_TierB`) for each remaining Tier-B component. Fill the `props`/`events`/`slots` arrays from each component's `defineProps`/`defineEmits`/`defineOptions` and template `<slot>`s.

**Process per component:** read the component's `.vue`, extract its real prop names/types/defaults, events, and slots, write the Overview block, verify in `ui:dev`, commit with `docs(atlas-ui): document <Name>`.

**Tier A — add Overview to existing story:**
- [ ] AtlasAlert
- [ ] AtlasAutocomplete
- [ ] AtlasCard
- [ ] AtlasCheckbox
- [ ] AtlasChip
- [ ] AtlasDataTable
- [ ] AtlasDialog
- [ ] AtlasIconButton
- [ ] AtlasPageShell
- [ ] AtlasRadio
- [ ] AtlasRadioGroup
- [ ] AtlasSelect
- [ ] AtlasSnackbar
- [ ] AtlasSwitch
- [ ] AtlasTextField
- [ ] AtlasFab (currently only in a shared story — give it an Overview where it lives)

**Tier B — create individual story + remove from `_TierB.story.vue`:**
- [ ] AtlasAvatar
- [ ] AtlasBanner
- [ ] AtlasCol
- [ ] AtlasContainer
- [ ] AtlasDivider
- [ ] AtlasIcon
- [ ] AtlasList
- [ ] AtlasListItem
- [ ] AtlasMenu
- [ ] AtlasPagination
- [ ] AtlasProgressCircular
- [ ] AtlasProgressLinear
- [ ] AtlasRow
- [ ] AtlasSpacer
- [ ] AtlasTab
- [ ] AtlasTabs
- [ ] AtlasTooltip

- [ ] **Final step: delete `_TierB.story.vue`** once every Tier-B component has its own story, then verify `npm run ui:build` succeeds and commit.

---

### Task 13: Intro / getting-started page

**Files:**
- Create: `src/components/ui/_docs/Introduction.story.vue`

- [ ] **Step 1: Create a `docsOnly` story** `src/components/ui/_docs/Introduction.story.vue`:

```vue
<script setup lang="ts">
import AtlasStoryDocs from '../_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story title="Introduction" group="top" :docs-only="true">
    <Variant title="Getting started">
      <AtlasStoryDocs
        name="Atlas UI"
        description="The Atlas3 design system: design tokens, a Vuetify theme, and ~40 Atlas* components. Use these to build Atlas3 views and plugins that look native and support light + dark themes."
        usage="import { AtlasButton, buildVuetifyOptions } from '@ohdsi/atlas-ui'
import '@ohdsi/atlas-ui/style.css'"
        :dos="['Import components and the theme from @ohdsi/atlas-ui.', 'Use --atlas-* CSS variables for custom styling so dark mode follows automatically.', 'See the Plugin Guide to build an Atlas3 extension.']"
        :donts="[`Don't hardcode hex colors — use tokens or --v-theme-* / --atlas-* vars.`]"
      />
    </Variant>
  </Story>
</template>
```

- [ ] **Step 2: Verify** `npm run ui:dev` shows "Introduction" at the top group.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/_docs/Introduction.story.vue
git commit -m "docs(histoire): add getting-started introduction page"
```

---

### Task 14: Design-tokens reference page

**Files:**
- Create: `src/components/ui/_docs/Tokens.story.vue`
- Create: `src/components/ui/_docs/TokenReference.vue`

- [ ] **Step 1: Create** `src/components/ui/_docs/TokenReference.vue` that renders swatches/rows from the live `tokens` object (so it never drifts):

```vue
<template>
  <div class="tok">
    <h3>Color — light / dark</h3>
    <div class="tok__grid">
      <div v-for="key in colorKeys" :key="key" class="tok__row">
        <span class="tok__name"><code>--atlas-color-{{ kebab(key) }}</code></span>
        <span class="tok__sw" :style="{ background: tokens.color[key] }" title="light" />
        <span class="tok__sw" :style="{ background: tokens.colorDark[key] }" title="dark" />
      </div>
    </div>

    <h3>Radius / Spacing</h3>
    <ul>
      <li v-for="(v, k) in tokens.radius" :key="'r'+k"><code>--atlas-radius-{{ k }}</code>: {{ v }}</li>
      <li v-for="(v, k) in tokens.spacing" :key="'s'+k"><code>--atlas-spacing-{{ k }}</code>: {{ v }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { tokens } from '@/ui/tokens'
const colorKeys = Object.keys(tokens.color) as (keyof typeof tokens.color)[]
const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
</script>

<style scoped>
.tok { color: rgb(var(--v-theme-on-surface)); }
.tok__row { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
.tok__name { width: 320px; }
.tok__sw { width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgb(var(--v-theme-outline)); display: inline-block; }
</style>
```

- [ ] **Step 2: Create** `src/components/ui/_docs/Tokens.story.vue`:

```vue
<script setup lang="ts">
import TokenReference from './TokenReference.vue'
</script>

<template>
  <Story title="Design Tokens" group="top">
    <Variant title="Reference">
      <TokenReference />
    </Variant>
  </Story>
</template>
```

- [ ] **Step 3: Verify** `npm run ui:dev` shows color swatches with light + dark columns.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/_docs/TokenReference.vue src/components/ui/_docs/Tokens.story.vue
git commit -m "docs(histoire): add design-tokens reference page"
```

---

### Task 15: Update `storyMatch` to include docs stories

**Files:**
- Modify: `histoire.config.ts`

- [ ] **Step 1:** The current `storyMatch` is `['src/components/ui/**/*.story.vue']`, which already covers `_docs/` and `_story/`-adjacent stories. Confirm the intro/tokens stories appear. If they don't (group `top`), verify the `tree.groups` includes `top` (it does). No change expected; if a path is excluded, broaden `storyMatch` accordingly.

- [ ] **Step 2:** Run `npm run ui:build`; expected: build succeeds and `dist` includes Introduction, Design Tokens, and per-component stories.

- [ ] **Step 3:** Commit only if changed.

---

## Phase 4 — Plugin developer experience

### Task 16: Upgrade the hello-world plugin to use atlas-ui

**Files:**
- Modify: `plugins-dev/hello-world-plugin/package.json`
- Modify: `plugins-dev/hello-world-plugin/vite.config.mjs`
- Modify: `plugins-dev/hello-world-plugin/src/main.ts`
- Rewrite: `plugins-dev/hello-world-plugin/src/App.vue`

**Goal:** The example plugin mounts its own Vuetify instance using `buildVuetifyOptions` from `@ohdsi/atlas-ui`, uses Atlas components, and looks native in light + dark — serving as the reference starter.

- [ ] **Step 1: Add dependencies** to `plugins-dev/hello-world-plugin/package.json`:

```json
  "dependencies": {
    "vue": "^3.4.0",
    "vuetify": "^3.5.0",
    "@ohdsi/atlas-ui": "file:../../packages/atlas-ui"
  },
```

> `@ohdsi/atlas-ui` is consumed from the local built package. Before building the plugin, run `npm run lib:build` at the repo root so `packages/atlas-ui/dist` exists.

- [ ] **Step 2: Configure Vuetify in the plugin's Vite build** — update `plugins-dev/hello-world-plugin/vite.config.mjs` to add the Vuetify plugin:

```js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  build: {
    lib: { entry: './src/main.ts', formats: ['system'], fileName: 'index' },
    rollupOptions: { external: [], output: { format: 'system' } },
    outDir: '../../public/plugins/hello-world-plugin',
  },
  define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production') },
});
```

Add `vite-plugin-vuetify` to `devDependencies` in the plugin `package.json`:

```json
    "vite-plugin-vuetify": "^2.1.2",
```

- [ ] **Step 3: Create the Vuetify instance in `main.ts`.** Replace `plugins-dev/hello-world-plugin/src/main.ts` `createApp`/`appOptions` so the mounted app installs Vuetify + theme:

```ts
import { h, createApp } from 'vue';
import singleSpaVue from 'single-spa-vue';
import { createVuetify } from 'vuetify';
import { buildVuetifyOptions } from '@ohdsi/atlas-ui';
import '@ohdsi/atlas-ui/style.css';
import App from './App.vue';

// (keep the existing PluginProps interface)

const vueLifecycles = singleSpaVue({
  createApp,
  appOptions: {
    render() {
      return h(App, {
        name: (this as PluginProps).name,
        authContext: (this as PluginProps).authContext,
        messageBus: (this as PluginProps).messageBus,
      });
    },
  },
  handleInstance(app, props) {
    app.use(createVuetify(buildVuetifyOptions()));
    app.provide('pluginProps', props);
  },
});

export const bootstrap = vueLifecycles.bootstrap;
export const mount = vueLifecycles.mount;
export const unmount = vueLifecycles.unmount;
```

- [ ] **Step 4: Rewrite `App.vue`** to use Atlas components instead of raw HTML. Replace `plugins-dev/hello-world-plugin/src/App.vue`:

```vue
<template>
  <v-theme-provider :theme="theme" with-background>
    <div style="padding: 24px; max-width: 800px; margin: 0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h1 style="color: rgb(var(--v-theme-primary)); margin:0;">Hello World Plugin</h1>
        <AtlasButton variant="ghost" size="sm" @click="theme = theme === 'dark' ? 'light' : 'dark'">
          {{ theme === 'dark' ? '☾ Dark' : '☀ Light' }}
        </AtlasButton>
      </div>

      <AtlasAlert v-if="authContext?.isAuthenticated" severity="info" style="margin:16px 0;">
        Welcome, {{ authContext.user?.username }}!
      </AtlasAlert>

      <AtlasCard padding="md" style="margin-bottom:16px;">
        <h3 style="margin-top:0;">Host communication</h3>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <AtlasButton @click="sendNotification">Show notification</AtlasButton>
          <AtlasButton variant="secondary" @click="requestNavigation">Navigate home</AtlasButton>
          <AtlasButton variant="tonal" @click="requestData">Request data</AtlasButton>
        </div>
      </AtlasCard>

      <AtlasCard padding="md">
        <h3 style="margin-top:0;">Plugin state</h3>
        <p>Counter: {{ counter }}</p>
        <div style="display:flex; gap:8px;">
          <AtlasButton size="sm" @click="counter++">Increment</AtlasButton>
          <AtlasButton size="sm" variant="secondary" @click="counter--">Decrement</AtlasButton>
        </div>
        <pre v-if="lastMessage" style="margin-top:12px;">{{ lastMessage }}</pre>
      </AtlasCard>
    </div>
  </v-theme-provider>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { AtlasButton, AtlasCard, AtlasAlert } from '@ohdsi/atlas-ui';

interface AuthContext { isAuthenticated: boolean; user?: { id: number; username: string; permissions: string[] } }
interface MessageBus { send: (type: string, payload: unknown) => void; request: (type: string, payload: unknown) => Promise<unknown> }

const props = defineProps<{ name: string; authContext: AuthContext; messageBus: MessageBus }>();
const theme = ref<'light' | 'dark'>('light');
const counter = ref(0);
const lastMessage = ref('');

function sendNotification() {
  props.messageBus.send('notification:show', { message: 'Hello from the plugin!', type: 'info', duration: 3000 });
  lastMessage.value = 'Sent notification:show';
}
function requestNavigation() {
  props.messageBus.send('navigation:request', { path: '/' });
  lastMessage.value = 'Sent navigation:request';
}
async function requestData() {
  try {
    const data = await props.messageBus.request('data:request', { resource: 'user-preferences' });
    lastMessage.value = `Received: ${JSON.stringify(data)}`;
  } catch (e: unknown) {
    lastMessage.value = `Error: ${e instanceof Error ? e.message : 'unknown'}`;
  }
}
</script>
```

- [ ] **Step 5: Build the library, then the plugin**

Run:
```bash
npm run lib:build
cd plugins-dev/hello-world-plugin && npm install && npm run build && cd ../..
```
Expected: plugin builds to `public/plugins/hello-world-plugin/index.js` without errors.

- [ ] **Step 6: Commit**

```bash
git add plugins-dev/hello-world-plugin
git commit -m "feat(plugins): hello-world example uses atlas-ui + theme (light/dark)"
```

---

### Task 17: Plugin authoring guide

**Files:**
- Create: `src/components/ui/_docs/PluginGuide.story.vue`
- Create: `docs/plugin-development-with-atlas-ui.md`

- [ ] **Step 1: Write the guide** `docs/plugin-development-with-atlas-ui.md` covering: the plugin contract (`{ name, authContext, messageBus }`), installing `@ohdsi/atlas-ui` (+ `vue`, `vuetify` peers), the Vite config (`vite-plugin-vuetify`), creating the Vuetify instance with `buildVuetifyOptions()` in `handleInstance`, importing `@ohdsi/atlas-ui/style.css`, using `--atlas-*` vars so dark mode follows, and pointing to `plugins-dev/hello-world-plugin` as the reference. Use the exact code from Task 16 as the worked example.

- [ ] **Step 2: Surface it in Histoire** — create `src/components/ui/_docs/PluginGuide.story.vue` as a `docsOnly` story that renders the key steps (mirror the markdown headings using `AtlasStoryDocs` `usage` blocks or plain HTML), titled "Plugin Guide", group `top`.

```vue
<script setup lang="ts">
import AtlasStoryDocs from '../_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story title="Plugin Guide" group="top" :docs-only="true">
    <Variant title="Build an Atlas3 plugin">
      <AtlasStoryDocs
        name="Build an Atlas3 plugin with atlas-ui"
        description="Atlas3 plugins are single-spa parcels receiving { name, authContext, messageBus }. Use @ohdsi/atlas-ui so your plugin looks native and supports light + dark. Full reference: plugins-dev/hello-world-plugin."
        usage="// main.ts — install Vuetify with the Atlas theme
import { createVuetify } from 'vuetify'
import { buildVuetifyOptions } from '@ohdsi/atlas-ui'
import '@ohdsi/atlas-ui/style.css'
handleInstance(app) { app.use(createVuetify(buildVuetifyOptions())) }"
        :dos="['Add vue + vuetify as peers and vite-plugin-vuetify to the build.', 'Style with --atlas-* / --v-theme-* vars so dark mode follows the host.', 'Copy plugins-dev/hello-world-plugin as a starting point.']"
        :donts="[`Don't hardcode colors; don't ship your own Vuetify theme that diverges from Atlas.`]"
      />
    </Variant>
  </Story>
</template>
```

- [ ] **Step 3: Verify** `npm run ui:dev` shows "Plugin Guide"; `npm run ui:build` succeeds.

- [ ] **Step 4: Commit**

```bash
git add docs/plugin-development-with-atlas-ui.md src/components/ui/_docs/PluginGuide.story.vue
git commit -m "docs(plugins): add Atlas3 plugin authoring guide"
```

---

## Phase 5 — Final verification

### Task 18: Full-suite gate + builds

- [ ] **Step 1:** `npm run type-check && npm run lint && npm run test:unit -- run` → all green.
- [ ] **Step 2:** `npm run tokens:check` → exits 0.
- [ ] **Step 3:** `npm run ui:build` → Histoire builds (intro, tokens, plugin guide, per-component stories, branded chrome, working dark toggle).
- [ ] **Step 4:** `npm run lib:build` → `packages/atlas-ui/dist/atlas-ui.css` has both `.v-theme--light` and `.v-theme--dark`.
- [ ] **Step 5:** `npx playwright test tests/e2e/visual-comparison.spec.ts` → PASS (incl. dark baselines).
- [ ] **Step 6:** Final review per superpowers:requesting-code-review before opening a PR to `develop`.

---

## Self-review notes

- **Spec coverage:** dark mode mechanism (Tasks 1-3), True Dark palette (Task 1), AtlasCard shadows (Task 4), dark-readiness verification (Tasks 6, 8), Histoire dark toggle (Task 6), branded chrome (Task 7), intro page (Task 13), tokens reference (Task 14), per-component docs incl. Tier B → individual stories (Tasks 9-12), plugin starter (Task 16), plugin guide (Task 17), visual refinement (folded into token/elevation work in Tasks 1 & 4 and the focus-ring/elevation tokens already in use). All spec sections map to tasks.
- **Histoire API risk:** `addWrapper` (Task 6) and the `theme`/`logo` config (Task 7) carry the only API uncertainty; each task includes a verified fallback (manual `<StoryThemeProvider>` wrapping; omit `logo`).
- **Type consistency:** `buildVuetifyOptions`, `tokens.color`, `tokens.colorDark`, `tokens.elevation.hover`, and `AtlasStoryDocs` prop shapes are used consistently across tasks.
