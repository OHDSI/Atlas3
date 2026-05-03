import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import '@/ui/tokens.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { buildVuetifyOptions } from '@/ui/theme'

export function createVuetifyInstance(primaryColor?: string | null) {
  return createVuetify({
    components,
    directives,
    ...buildVuetifyOptions(primaryColor),
  })
}

export default createVuetifyInstance()
