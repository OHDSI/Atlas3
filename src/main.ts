/**
 * Main Application Entry Point
 * Atlas Cohort Builder - Vue 3 + Vuetify
 */
import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import { createVuetifyInstance } from './plugins/vuetify'
import { pluginConfigService } from './services/PluginConfigService'
import App from './App.vue'
import { setupAuthInterceptor } from './services/auth/authInterceptor'
import { useAuthStore } from './stores/auth'
import { useLocaleStore } from './stores/locale'
import { initializePluginFramework } from './plugins/index.ts'
import { setupGlobalMessageHandler } from './plugins/messaging/HostMessageBus.ts'
import { tokenExpiryService } from './services/auth/tokenExpiry'
import { configLoaderService } from './services/config-loader.service'
import { logger } from './utils/logger'

// SystemJS is loaded from index.html with import map for 'vue'
logger.debug('Main', 'SystemJS available:', !!window.System)

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

// Initialize app creation function (will be called after loading plugin config)
async function initializeApp() {
  // Load plugin configuration to get theme settings
  let primaryColor: string | null = null
  try {
    await pluginConfigService.loadConfig()
    primaryColor = pluginConfigService.getPrimaryColor()
    if (primaryColor) {
      logger.info('Main', 'Using custom primary color from plugins.json:', primaryColor)
    }
  } catch (error) {
    logger.warn('Main', 'Failed to load plugin config for theme, using defaults:', error)
  }

  // Create Vuetify instance with custom theme
  const vuetify = createVuetifyInstance(primaryColor)

  const app = createApp(App)

  // Register ECharts component globally
  app.component('VChart', ECharts)

  // Install Pinia (state management)
  app.use(createPinia())

  // Install Vue Router
  app.use(router)

  // Install Vuetify (UI framework)
  app.use(vuetify)

  return app
}

// Setup authentication interceptor
setupAuthInterceptor()

// Setup plugin message handler
setupGlobalMessageHandler(router)

// Initialize and mount the app
initializeApp().then(async (app) => {
  // Initialize stores
  const authStore = useAuthStore()
  const localeStore = useLocaleStore()

  // Mount app first, then initialize stores asynchronously
  // This ensures the app is interactive immediately
  await router.isReady().then(async () => {
  // Load configuration early
  logger.info('Config', 'Loading atlas-config.json...')
  try {
    const validationResult = await configLoaderService.loadConfiguration()
    if (validationResult.valid) {
      logger.info('Config', 'Configuration loaded successfully')
    } else if (validationResult.validFilterTypes.length > 0) {
      logger.warn(
        'Config',
        `Configuration loaded with errors (${validationResult.validFilterTypes.length} valid filters)`
      )
    } else {
      logger.error('Config', 'Configuration loading failed - no valid filters')
    }

    // Make validation result available globally for UI components
    app.provide('configValidationResult', validationResult)
  } catch (error) {
    logger.error('Config', 'Critical error loading configuration:', error)
  }

  // Mount the app first so it's interactive
  app.mount('#app')

  // Setup token expiry watcher
  watch(() => authStore.token, (newToken) => {
    if (newToken) {
      tokenExpiryService.setupExpiryWarning(newToken)
    } else {
      tokenExpiryService.cancelExpiryWarning()
    }
  }, { immediate: true })

  // Initialize stores asynchronously after mount
  Promise.all([
    authStore.initializeFromStorage().catch((error) => {
      logger.error('Auth', 'Initialization failed:', error)
    }),
    localeStore.initialize().catch((error) => {
      logger.error('i18n', 'Initialization failed:', error)
    })
  ]).then(async () => {
    // Initialize plugin framework after auth is ready
    try {
      // Import permission service for proper permission checking
      const { permissionService } = await import('@/services/auth/permissions');

      // Extract flat array of permissions from permissionIdx object
      const userPermissions = authStore.user?.permissionIdx
        ? Object.values(authStore.user.permissionIdx).flat()
        : [];

      const authContext = {
        user: authStore.user ? {
          id: authStore.user.login || '',
          username: authStore.user.displayName || authStore.user.login || '',
          email: authStore.user.email,
          permissions: userPermissions,
        } : null,
        token: authStore.token,
        isAuthenticated: authStore.isAuthenticated,
        hasPermission(permission: string): boolean {
          if (!this.user) return false;
          return permissionService.hasPermission(permission, this.user.permissions);
        },
      };

      await initializePluginFramework(authContext);
      logger.info('App', 'Plugin framework initialized')
    } catch (error) {
      logger.error('App', 'Plugin framework initialization failed:', error)
    }
  })
  }).catch((error) => {
    logger.error('App', 'Router initialization failed:', error)
    // Mount anyway
    app.mount('#app')
  })
}).catch((error) => {
  logger.error('App', 'Application initialization failed:', error)
})
