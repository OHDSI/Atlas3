/**
 * Main Application Entry Point
 * Atlas Cohort Builder - Vue 3 + Vuetify
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import vuetify from './plugins/vuetify'
import App from './App.vue'
import { setupAuthInterceptor } from './services/auth/authInterceptor'
import { useAuthStore } from './stores/auth'
import { useLocaleStore } from './stores/locale'

// ECharts imports for tree-shaking
import ECharts from 'vue-echarts'
import { use } from 'echarts/core'

// Import ECharts chart types
import {
  BarChart,
  PieChart,
  LineChart,
  TreemapChart
} from 'echarts/charts'

// Import ECharts components
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  TransformComponent
} from 'echarts/components'

// Import ECharts features and renderers
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'

// Register ECharts components (tree-shaking friendly)
use([
  BarChart,
  PieChart,
  LineChart,
  TreemapChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  TransformComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
  SVGRenderer
])

const app = createApp(App)

// Register ECharts component globally
app.component('v-chart', ECharts)

// Install Pinia (state management)
app.use(createPinia())

// Install Vue Router
app.use(router)

// Install Vuetify (UI framework)
app.use(vuetify)

// Setup authentication interceptor
setupAuthInterceptor()

// Initialize stores before mounting
const authStore = useAuthStore()
const localeStore = useLocaleStore()

// Wait for router and stores to initialize before mounting
// This ensures the app is fully ready when rendered
Promise.all([
  router.isReady(),
  authStore.initializeFromStorage().catch((error) => {
    console.error('[Auth] Initialization failed:', error)
  }),
  localeStore.initialize().catch((error) => {
    console.error('[i18n] Initialization failed:', error)
  })
]).then(() => {
  app.mount('#app')
}).catch((error) => {
  console.error('[App] Initialization failed:', error)
  // Mount anyway with fallback translations
  app.mount('#app')
})
