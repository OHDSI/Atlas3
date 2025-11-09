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

// Initialize auth store from storage (async to fetch user info)
const authStore = useAuthStore()
authStore.initializeFromStorage().catch((error) => {
  console.error('[Auth] Initialization failed:', error)
})

app.mount('#app')
