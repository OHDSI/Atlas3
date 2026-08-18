/**
 * Main Application Entry Point
 * Atlas Cohort Builder - Vue 3 + Vuetify
 */
import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import { createVuetifyInstance } from './plugins/vuetify'
import { setChartPalette, setChartTheme } from '@/ui/chart-config'
import { pluginConfigService } from './services/PluginConfigService'
import { useThemeStore } from './stores/theme'
import App from './App.vue'
import { setupAuthInterceptor } from './services/auth/authInterceptor'
import { useAuthStore } from './stores/auth'
import { useLocaleStore } from './stores/locale'
import { initializePluginFramework } from './plugins/index.ts'
import type { AuthContext } from './models/PluginModels'
import { setupGlobalMessageHandler } from './plugins/messaging/HostMessageBus.ts'
import { setupPythiaBridge } from './plugins/host/pythiaBridge.ts'
import { initWebMcp } from './plugins/host/webmcp'
import { tokenExpiryService } from './services/auth/tokenExpiry'
import { configLoaderService } from './services/config-loader.service'
import { loadAppConfig } from './config/app-config.loader'
import { getAuthConfig } from './config/auth.config'
import { logger } from './utils/logger'
import '@/assets/styles/typography.css'
import '@/assets/styles/vuetify-overrides.css'

// ECharts imports for tree-shaking
import ECharts from 'vue-echarts'
import { use } from 'echarts/core'

// Import ECharts chart types
import {
  BarChart,
  PieChart,
  LineChart,
  ScatterChart,
  TreemapChart,
  SunburstChart,
  BoxplotChart,
  CustomChart,
  FunnelChart,
} from 'echarts/charts'

// Import ECharts components
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  TransformComponent,
  BrushComponent,
  ToolboxComponent,
} from 'echarts/components'

// Import ECharts features and renderers
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'

// Register ECharts components (tree-shaking friendly)
use([
  BarChart,
  PieChart,
  LineChart,
  ScatterChart,
  TreemapChart,
  SunburstChart,
  BoxplotChart,
  CustomChart,
  FunnelChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  TransformComponent,
  BrushComponent,
  ToolboxComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
  SVGRenderer,
])

// Initialize app creation function (will be called after loading plugin config)
async function initializeApp() {
  // Load plugin configuration to get theme settings
  let primaryColor: string | null = null
  let defaultThemeMode: 'light' | 'dark' | 'system' | null = null
  try {
    await pluginConfigService.loadConfig()
    primaryColor = pluginConfigService.getPrimaryColor()
    if (primaryColor) {
      logger.info('Main', 'Using custom primary color from plugins.json:', primaryColor)
    }

    // Accent lives in CSS (--atlas-color-accent), not the Vuetify theme, so set it
    // on the root element where it wins over the :root defaults in tokens.css.
    const accentColor = pluginConfigService.getAccentColor()
    if (accentColor) {
      document.documentElement.style.setProperty('--atlas-color-accent', accentColor)
      logger.info('Main', 'Using custom accent color from plugins.json:', accentColor)
    }

    // Applied before the app mounts, so the first chart already renders branded.
    const chartColors = pluginConfigService.getChartColors()
    const treemapGradient = pluginConfigService.getTreemapGradient()
    if (chartColors || treemapGradient) {
      setChartPalette({ chartColors, treemapGradient })
      logger.info('Main', 'Using custom chart palette from plugins.json')
    }

    defaultThemeMode = pluginConfigService.getDefaultThemeMode()
  } catch (error) {
    logger.warn('Main', 'Failed to load plugin config for theme, using defaults:', error)
  }

  // Create Vuetify instance with custom theme
  const vuetify = createVuetifyInstance(primaryColor)
  // Expose for plugins that mark `vuetify` as external and resolve it via
  // SystemJS at runtime (see index.html). Same singleton as the host's app.
  ;(window as unknown as { __atlasVuetify?: unknown }).__atlasVuetify = vuetify

  const app = createApp(App)

  // Register ECharts component globally
  app.component('VChart', ECharts)

  // Install Pinia (state management)
  app.use(createPinia())

  // Install Vue Router
  app.use(router)

  // Install Vuetify (UI framework)
  app.use(vuetify)

  // Resolve and apply the active theme before mount so there is no
  // light-to-dark flash on first paint.
  const themeStore = useThemeStore()
  themeStore.initialize(defaultThemeMode ?? 'light')
  vuetify.theme.change(themeStore.resolved)
  setChartTheme(themeStore.resolved)
  watch(
    () => themeStore.resolved,
    (mode) => {
      vuetify.theme.change(mode)
      setChartTheme(mode)
    },
  )

  return app
}

// Setup authentication interceptor
setupAuthInterceptor()

// Setup plugin message handler
setupGlobalMessageHandler(router)
setupPythiaBridge()
initWebMcp()

// Initialize and mount the app
loadAppConfig()
  .then(() => initializeApp())
  .then(async app => {
    // Initialize stores
    const authStore = useAuthStore()
    const localeStore = useLocaleStore()

    // Hydrate auth from localStorage SYNCHRONOUSLY before the router
    // resolves its initial navigation. router.isReady() runs the
    // beforeEach guards; if the store doesn't have the token by then,
    // the auth guard sees isAuthenticated=false and pops the login
    // modal — even when localStorage has a perfectly valid token.
    // Has to live above router.isReady().
    authStore.hydrateAuth()

    // Mount app first, then initialize stores asynchronously
    // This ensures the app is interactive immediately
    try {
      await router.isReady()
    } catch (error) {
      logger.error('App', 'Router initialization failed:', error)
    }

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

    // Mount the app first so it's interactive. Everything below runs after the
    // mount, so nothing here may re-enter it.
    app.mount('#app')

    // Setup token expiry watcher
    watch(
      () => authStore.token,
      newToken => {
        if (newToken) {
          tokenExpiryService.setupExpiryWarning(newToken)
        } else {
          tokenExpiryService.cancelExpiryWarning()
        }
      },
      { immediate: true }
    )

    // Initialize stores asynchronously after mount
    void Promise.all([
      authStore.initializeFromStorage().catch(error => {
        logger.error('Auth', 'Initialization failed:', error)
      }),
      localeStore.initialize().catch(error => {
        logger.error('i18n', 'Initialization failed:', error)
      }),
    ]).then(async () => {
      // The initial route guard ran before user/me resolved (userResolved
      // was still false), so it deferred the login prompt. Now that the
      // subject is resolved, prompt if the landing route needs auth and
      // neither an authenticated nor anonymous subject was found.
      const currentRoute = router.currentRoute.value
      if (
        currentRoute.meta.requiresAuth === true &&
        !authStore.isAuthenticated &&
        !authStore.user &&
        getAuthConfig().userAuthenticationEnabled
      ) {
        authStore.openLoginModal()
      }

      // Initialize plugin framework after auth is ready
      try {
        // Import permission service for proper permission checking
        const { permissionService } = await import('@/services/auth/permissions')

        // Read through to the store on every access: plugins keep this object
        // across token refreshes, Run As and logout.
        const currentUser = (): AuthContext['user'] => {
          const user = authStore.user
          if (!user) return null
          return {
            id: user.login || '',
            username: user.displayName || user.login || '',
            email: user.email,
            permissions: user.permissionIdx ? Object.values(user.permissionIdx).flat() : [],
          }
        }

        const authContext: AuthContext = {
          get user() {
            return currentUser()
          },
          get token() {
            return authStore.token
          },
          get isAuthenticated() {
            return authStore.isAuthenticated
          },
          hasPermission(permission: string): boolean {
            const user = currentUser()
            if (!user) return false
            return permissionService.hasPermission(permission, user.permissions)
          },
        }

        await initializePluginFramework(authContext)
        logger.info('App', 'Plugin framework initialized')
      } catch (error) {
        logger.error('App', 'Plugin framework initialization failed:', error)
      }
    })
  })
  .catch(error => {
    logger.error('App', 'Application initialization failed:', error)
  })

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', event => {
  logger.error('Unhandled', 'Promise rejection', event.reason)
})
