/**
 * Vue Router Configuration
 * Basic routing for cohort builder SPA with OAuth callback support and authentication guards
 */
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useLocaleStore } from '@/stores/locale'
import { getAuthConfig } from '@/config/auth.config'
import { pluginConfigService } from '@/services/PluginConfigService'
import { logger } from '@/utils/logger'
import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Deeplink guard - handles ?cohortId=X and ?route=/path on initial load
let deeplinkProcessed = false

router.beforeEach(
  (to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    if (deeplinkProcessed) {
      next()
      return
    }

    // Skip on auth callbacks
    if (to.meta.isOAuthCallback || to.meta.isSAMLCallback || to.meta.isOpenIDCallback) {
      deeplinkProcessed = true
      next()
      return
    }

    const cohortId = to.query.cohortId as string
    const routeParam = to.query.route as string

    if (cohortId) {
      deeplinkProcessed = true
      logger.info('Router', `Deeplink: redirecting to cohort ${cohortId}`)
      next({ path: `/cohorts/${cohortId}`, replace: true })
      return
    }

    if (routeParam) {
      deeplinkProcessed = true
      const targetRoute = routeParam.startsWith('/') ? routeParam : `/${routeParam}`

      // Validate route exists to prevent open redirect
      const resolved = router.resolve(targetRoute)
      if (resolved.matched.length === 0) {
        logger.warn('Router', `Deeplink: invalid route ${targetRoute}, ignoring`)
        next()
        return
      }

      logger.info('Router', `Deeplink: redirecting to route ${targetRoute}`)
      next({ path: targetRoute, replace: true })
      return
    }
    deeplinkProcessed = true
    next()
  }
)

// Home redirect guard - must run before auth guard
router.beforeEach(
  (to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    if (to.path === '/') {
      const logoNavigateTo = pluginConfigService.getLogoNavigateTo()
      if (logoNavigateTo && logoNavigateTo !== '/') {
        next(logoNavigateTo)
        return
      }
    }
    next()
  }
)

// OAuth/SAML/OpenID callback handler
router.beforeEach(async (to, _from, next) => {
  const isAuthCallback =
    to.meta.isOAuthCallback ||
    to.meta.isSAMLCallback ||
    to.meta.isOpenIDCallback ||
    to.path === '/oauth/callback' ||
    to.path === '/saml/callback' ||
    to.path === '/openid/callback'

  if (isAuthCallback) {
    const authStore = useAuthStore()

    try {
      // Check for token in localStorage (Atlas pattern - backend sets this)
      const localStorageToken = localStorage.getItem('bearerToken')
      if (localStorageToken && localStorageToken !== 'null' && localStorageToken !== 'undefined') {
        authStore.setToken(localStorageToken)

        // Fetch user info
        const { authService } = await import('@/services/auth/authService')
        const userInfo = await authService.fetchUserInfo()
        authStore.setUser(userInfo)
        authStore.setAuthClient('OpenID')

        // Restore destination URL or redirect to home
        const destination = sessionStorage.getItem('oauth_redirect_destination')
        sessionStorage.removeItem('oauth_redirect_destination')

        next(destination || '/')
        return
      }

      // Check for token in URL path parameters (WebAPI pattern: /:client/:token/:redirectUrl?)
      const tokenFromPath = to.params.token as string
      const clientFromPath = to.params.client as string
      const redirectUrlFromPath = to.params.redirectUrl as string

      if (tokenFromPath) {
        logger.info('Router', 'Token received in URL path (WebAPI pattern)')
        logger.debug('Router', 'OAuth details', {
          client: clientFromPath,
          redirectUrl: redirectUrlFromPath,
        })

        authStore.setToken(tokenFromPath)

        // Fetch user info
        const { authService } = await import('@/services/auth/authService')
        const userInfo = await authService.fetchUserInfo()
        authStore.setUser(userInfo)
        authStore.setAuthClient(clientFromPath || 'OpenID')

        // Use redirectUrl from path or restore from sessionStorage
        let destination = redirectUrlFromPath ? decodeURIComponent(redirectUrlFromPath) : null
        if (!destination) {
          destination = sessionStorage.getItem('oauth_redirect_destination')
          sessionStorage.removeItem('oauth_redirect_destination')
        }

        // If destination matches the base path, redirect to root to avoid duplication
        const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
        if (destination === basePath || destination === `${basePath}/`) {
          destination = '/'
        }

        next(destination || '/')
        return
      }

      // Check for token in URL query parameters (some OAuth providers use this)
      const token = to.query.token as string

      if (token) {
        logger.info('Router', 'Token received in URL query')
        authStore.setToken(token)

        // Fetch user info
        const { authService } = await import('@/services/auth/authService')
        const userInfo = await authService.fetchUserInfo()
        authStore.setUser(userInfo)

        // Restore destination URL or redirect to home
        const destination = sessionStorage.getItem('oauth_redirect_destination')
        sessionStorage.removeItem('oauth_redirect_destination')

        next(destination || '/')
        return
      }

      // Check for token in cookies (WebAPI might set it there)
      const cookieToken = getCookieToken()
      if (cookieToken) {
        logger.info('Router', 'Token found in cookie')
        authStore.setToken(cookieToken)

        // Fetch user info
        const { authService } = await import('@/services/auth/authService')
        const userInfo = await authService.fetchUserInfo()
        authStore.setUser(userInfo)

        // Clear the cookie token
        document.cookie = 'bearerToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

        // Restore destination URL or redirect to home
        const destination = sessionStorage.getItem('oauth_redirect_destination')
        sessionStorage.removeItem('oauth_redirect_destination')

        next(destination || '/')
        return
      }

      // No token found - OAuth failed
      logger.error('Router', 'No token received from OAuth provider')
      authStore.setError('Authentication failed - no token received')
      next('/')
      return
    } catch (error) {
      logger.error('Router', 'OAuth callback error', error)
      authStore.setError(error instanceof Error ? error.message : 'Authentication failed')
      next('/')
      return
    }
  }

  next()
})

/**
 * Authentication guard - check if route requires authentication
 */
router.beforeEach(
  (to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    // Skip auth check for OAuth/SAML/OpenID callbacks (handled by their specific guard)
    if (to.meta.isOAuthCallback || to.meta.isSAMLCallback || to.meta.isOpenIDCallback) {
      next()
      return
    }

    // Skip auth check if authentication is disabled
    if (!getAuthConfig().userAuthenticationEnabled) {
      next()
      return
    }

    // Check if route requires authentication
    const requiresAuth = to.meta.requiresAuth === true // Default to false unless explicitly set to true

    if (requiresAuth) {
      const authStore = useAuthStore()

      // If not authenticated, show login modal and stay on current page
      // BUT only if authentication is actually enabled
      if (!authStore.isAuthenticated && getAuthConfig().userAuthenticationEnabled) {
        logger.debug('Router', 'Route requires auth, opening login modal')
        authStore.openLoginModal()

        // Allow navigation anyway - login modal will overlay
        // This prevents redirect loops and allows the app to render
        next()
        return
      }
    }

    next()
  }
)

/**
 * Configuration Panel Guard - Auto-close panel on navigation
 */
router.beforeEach(
  (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    // Auto-close config panel when navigating to a different route
    if (from.path !== to.path) {
      const uiStore = useUIStore()

      if (uiStore.configPanelState.isOpen) {
        uiStore.closeConfigPanel()
      }
    }

    next()
  }
)

const APP_TITLE = 'ATLAS'

function applyDocumentTitle(route: RouteLocationNormalized): void {
  if (typeof document === 'undefined') return
  const titleKey = (route.meta as { titleKey?: string }).titleKey
  if (!titleKey) {
    document.title = APP_TITLE
    return
  }
  let label: string = titleKey
  try {
    const localeStore = useLocaleStore()
    const translations = localeStore.translations as Record<string, unknown>
    const segments = titleKey.split('.')
    let value: unknown = translations
    for (const seg of segments) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[seg]
      } else {
        value = undefined
        break
      }
    }
    if (typeof value === 'string' && value.length > 0) {
      label = value
    }
  } catch {
    // Pinia not yet installed (e.g. early in bootstrap or in isolated tests);
    // fall back to the title key itself.
  }
  document.title = `${label} | ${APP_TITLE}`
}

router.afterEach((to: RouteLocationNormalized) => {
  applyDocumentTitle(to)
})

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('locale-changed', () => {
    applyDocumentTitle(router.currentRoute.value)
  })
}

/**
 * Get token from cookie
 */
function getCookieToken(): string | null {
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'bearerToken' && value) {
      return decodeURIComponent(value)
    }
  }
  return null
}

export default router
