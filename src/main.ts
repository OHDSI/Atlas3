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
import { initializePluginFramework } from './plugins'
import { setupGlobalMessageHandler } from './plugins/messaging/HostMessageBus'

// SystemJS is loaded from index.html with import map for 'vue'
console.log('[Main] SystemJS available:', !!window.System);

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

// Setup plugin message handler
setupGlobalMessageHandler(router)

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
]).then(async () => {
  // Initialize plugin framework after auth is ready
  try {
    const authContext = {
      user: authStore.user ? {
        id: authStore.user.login || '',
        username: authStore.user.displayName || authStore.user.login || '',
        email: authStore.user.email,
        permissions: [], // Convert permissionIdx to array if needed
      } : null,
      token: authStore.token,
      isAuthenticated: authStore.isAuthenticated,
      hasPermission(_permission: string): boolean {
        if (!this.user) return false;
        // TODO: Implement proper permission checking with permissionIdx
        return true;
      },
    };
    
    await initializePluginFramework(authContext);
    console.log('[App] Plugin framework initialized');
  } catch (error) {
    console.error('[App] Plugin framework initialization failed:', error);
  }
  
  app.mount('#app')
}).catch((error) => {
  console.error('[App] Initialization failed:', error)
  // Mount anyway with fallback translations
  app.mount('#app')
})
