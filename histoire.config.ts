// histoire.config.ts
import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'

export default defineConfig({
  plugins: [HstVue()],
  setupFile: './histoire.setup.ts',
  storyMatch: ['src/components/ui/**/*.story.vue'],
  vite: {
    base: '/Atlas3/',
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
