import { h, createApp } from 'vue'
import singleSpaVue from 'single-spa-vue'
import { createVuetify } from 'vuetify'
// NOTE: do NOT `import 'vuetify/styles'` — the host page already loads
// Vuetify CSS at the same major version. Importing it here would ship a
// second copy that wins via cascade order and overrides the host's theme,
// fonts, spacing, etc. (visible as the plugin "fighting" the main app).
// Vuetify components produce stable classnames (v-card, v-btn, …) that the
// host's already-loaded stylesheet matches, so styling Just Works.
import App from './App.vue'

export interface AuthContext {
  user: { id?: string; username?: string; permissions?: string[] } | null
  token: string | null
  isAuthenticated: boolean
  hasPermission: (permission: string) => boolean
}

export interface MessageBus {
  send: (type: string, payload: unknown) => void
  request: <T>(type: string, payload: unknown) => Promise<T>
  subscribe: (type: string, callback: (data: unknown) => void) => () => void
}

export type Translator = (key: string, defaultValue?: string) => string

export interface PluginProps {
  name: string
  mountParcel?: unknown
  singleSpa?: unknown
  authContext: AuthContext
  messageBus: MessageBus
  t?: Translator
  getToken?: () => Promise<string>
}

// Create a Vuetify instance that:
//   1) Provides Vue's defaults injection so our v-card / v-btn / etc. mount
//      successfully (without this, parcel components throw "Could not find
//      defaults instance").
//   2) Does NOT write a `:root { --v-theme-* }` stylesheet that would
//      overwrite the host's theme. We pass `theme: false` to suppress the
//      theme system entirely; component styling falls back to whatever
//      bg-primary / surface-variant rules the HOST's already-loaded
//      Vuetify CSS exposes — same theme tokens, no conflict.
function createParcelVuetify() {
  return createVuetify({ theme: false })
}

const vueLifecycles = singleSpaVue({
  createApp,
  appOptions: {
    render() {
      return h(App, {
        name: (this as PluginProps).name,
        authContext: (this as PluginProps).authContext,
        messageBus: (this as PluginProps).messageBus,
        t: (this as PluginProps).t,
        getToken: (this as PluginProps).getToken,
      })
    },
  },
  handleInstance(app, props) {
    app.use(createParcelVuetify())
    app.provide('pluginProps', props)
  },
})

export const bootstrap = vueLifecycles.bootstrap
export const mount = vueLifecycles.mount
export const unmount = vueLifecycles.unmount
