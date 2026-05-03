// histoire.setup.ts
import 'vuetify/styles'
import '@/ui/tokens.css'
import { defineSetupVue3 } from '@histoire/plugin-vue'
import { createVuetifyInstance } from '@/plugins/vuetify'

export const setupVue3 = defineSetupVue3(({ app }) => {
  app.use(createVuetifyInstance())
})
