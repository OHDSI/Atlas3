// histoire.setup.ts
import 'vuetify/styles'
import '@/ui/tokens.css'
// Match the app: load the same global typography + Vuetify refinements that
// src/main.ts loads, so components render identically to inside Atlas.
import '@/assets/styles/typography.css'
import '@/assets/styles/vuetify-overrides.css'
import { defineSetupVue3 } from '@histoire/plugin-vue'
import { createVuetifyInstance } from '@/plugins/vuetify'
import StoryThemeProvider from '@/components/ui/_story/StoryThemeProvider.vue'

export const setupVue3 = defineSetupVue3(({ app, addWrapper }) => {
  app.use(createVuetifyInstance())
  addWrapper(StoryThemeProvider)
})
