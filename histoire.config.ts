// histoire.config.ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'

// Histoire 1.0.0-beta.1 bug: the virtual markdown-files module embeds an absolute
// file:// URI to histoire/dist/node/vendors/vue.js. Vite 5 promotes the resulting
// UNRESOLVED_IMPORT Rollup warning to a hard error. This plugin intercepts the URI
// before Rollup sees it and redirects to the public @histoire/vendors/vue entry.
const histoireVendorsVueFileUrl = new URL(
  './node_modules/histoire/dist/node/vendors/vue.js',
  import.meta.url,
).href

const fixHistoireVendorsVue = {
  name: 'fix-histoire-vendors-vue',
  resolveId(id: string) {
    if (id === histoireVendorsVueFileUrl) {
      return { id: fileURLToPath(id), external: false }
    }
  },
}

export default defineConfig({
  plugins: [HstVue()],
  setupFile: './histoire.setup.ts',
  storyMatch: ['src/components/ui/**/*.story.vue'],
  vite: {
    plugins: [fixHistoireVendorsVue],
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },
  tree: {
    groups: [
      { id: 'top', title: '' },
      { id: 'tier-a', title: 'Tier A — Semantic' },
      { id: 'tier-b', title: 'Tier B — Canonical' },
    ],
  },
})
