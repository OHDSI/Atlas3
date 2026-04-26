/**
 * Vue Router Configuration
 * Basic routing for cohort builder SPA with OAuth callback support and authentication guards
 */
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { authConfig } from '@/config/auth.config'
import { generatePluginRoutes } from '@/plugins/navigation/PluginRoutes.ts'
import { pluginConfigService } from '@/services/PluginConfigService'
import { logger } from '@/utils/logger'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/LandingView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/cohorts',
      name: 'cohorts',
      component: () => import('@/views/CohortsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/cohorts/new',
      name: 'cohort-new',
      component: () => import('@/views/CohortBuilderView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/cohorts/:id',
      name: 'cohort-edit',
      component: () => import('@/views/CohortBuilderView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/feature-analyses',
      name: 'feature-analyses',
      component: () => import('@/views/FeatureAnalysesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/feature-analyses/new',
      name: 'feature-analysis-new',
      component: () => import('@/views/FeatureAnalysisEditorView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/feature-analyses/:id',
      name: 'feature-analysis-edit',
      component: () => import('@/views/FeatureAnalysisEditorView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/characterizations',
      name: 'characterizations',
      component: () => import('@/views/CharacterizationsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/characterizations/new',
      name: 'characterization-new',
      component: () => import('@/views/CharacterizationBuilderView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/characterizations/:id',
      name: 'characterization-edit',
      component: () => import('@/views/CharacterizationBuilderView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/characterizations/:id/results/:executionId',
      name: 'characterization-results',
      component: () => import('@/views/CharacterizationResultsView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      // NOTE: beforeEnter version-preview hook is intentionally deferred to
      // Phase 3B when the store gains loadVersionPreview / clearPreviewVersion.
      path: '/characterization/:id/version/:version',
      name: 'characterization-version-preview',
      component: () => import('@/views/CharacterizationBuilderView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    // Version preview routes (T036, T037)
    {
      path: '/cohortdefinition/:id/version/:version',
      name: 'cohort-version-preview',
      component: () => import('@/views/CohortBuilderView.vue'),
      props: true,
      meta: { requiresAuth: true },
      beforeEnter: async (to, _from, next) => {
        const { useCohortStore } = await import('@/stores/cohort')
        const cohortStore = useCohortStore()
        const versionParam = to.params.version as string

        if (versionParam === 'current') {
          // Clear preview mode (T037)
          await cohortStore.clearPreviewVersion()
        } else {
          // Load version for preview (T037)
          const versionNumber = parseInt(versionParam)
          if (!isNaN(versionNumber)) {
            try {
              await cohortStore.loadVersionPreview(versionNumber)
            } catch (error) {
              logger.error('Router', 'Failed to load version preview', error)
              // Continue navigation anyway - let the view handle the error
            }
          }
        }
        next()
      },
    },
    {
      path: '/conceptset/:id/version/:version',
      name: 'conceptset-version-preview',
      component: () => import('@/views/ConceptsView.vue'),
      props: true,
      meta: { requiresAuth: true },
      beforeEnter: async (to, _from, next) => {
        const { useConceptSetsStore } = await import('@/stores/concept-sets')
        const conceptSetsStore = useConceptSetsStore()
        const versionParam = to.params.version as string

        if (versionParam === 'current') {
          // Clear preview mode (T037)
          await conceptSetsStore.clearPreviewVersion()
        } else {
          // Load version for preview (T037)
          const versionNumber = parseInt(versionParam)
          if (!isNaN(versionNumber)) {
            try {
              await conceptSetsStore.loadVersionPreview(versionNumber)
            } catch (error) {
              logger.error('Router', 'Failed to load version preview', error)
              // Continue navigation anyway - let the view handle the error
            }
          }
        }
        next()
      },
    },
    {
      path: '/concepts',
      name: 'concepts',
      component: () => import('@/views/ConceptsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/pathways',
      name: 'pathways',
      component: () => import('@/views/PathwaysView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/pathways/new',
      name: 'pathway-new',
      component: () => import('@/views/PathwayManagerView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/pathways/:id(\\d+)',
      name: 'pathway-edit',
      component: () => import('@/views/PathwayManagerView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/pathway-analysis/:id(\\d+)/version/:version',
      name: 'pathway-version-preview',
      component: () => import('@/views/PathwayManagerView.vue'),
      props: true,
      meta: { requiresAuth: true },
      beforeEnter: async (to, _from, next) => {
        const { usePathwayStore } = await import('@/stores/pathway')
        const pathwayStore = usePathwayStore()
        const versionParam = to.params.version as string
        const idParam = Number(to.params.id)
        if (versionParam === 'current') {
          pathwayStore.clearPreviewVersion()
        } else if (Number.isFinite(idParam)) {
          const versionNumber = parseInt(versionParam)
          if (!isNaN(versionNumber)) {
            try {
              await pathwayStore.loadVersionPreview(idParam, versionNumber)
            } catch (error) {
              logger.error('Router', 'Failed to load pathway version preview', error)
            }
          }
        }
        next()
      },
    },
    {
      path: '/pathways/:id(\\d+)/results/:executionId(\\d+)',
      name: 'pathway-results',
      component: () => import('@/views/PathwayResultsView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/datasources/:sourceKey?/:reportType?',
      name: 'datasources',
      component: () => import('@/views/DataSourcesView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    // Role and Permissions Management routes
    {
      path: '/config/roles',
      name: 'role-management',
      component: () => import('@/views/config/RoleManagementView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/config/roles/:id',
      name: 'role-details',
      component: () => import('@/views/config/RoleDetailsView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/oauth/callback',
      name: 'oauth-callback',
      component: () => import('@/views/LandingView.vue'),
      meta: { isOAuthCallback: true },
    },
    {
      path: '/saml/callback',
      name: 'saml-callback',
      component: () => import('@/views/LandingView.vue'),
      meta: { isSAMLCallback: true },
    },
    {
      path: '/openid/callback',
      name: 'openid-callback',
      component: () => import('@/views/LandingView.vue'),
      meta: { isOpenIDCallback: true },
    },
    {
      path: '/:client/:token/:redirectUrl?',
      name: 'oauth-token',
      component: () => import('@/views/LandingView.vue'),
      meta: { isOAuthCallback: true },
    },
    ...generatePluginRoutes(),
  ],
})

// Deeplink guard - handles ?cohortId=X and ?route=/path on initial load
let deeplinkProcessed = false

router.beforeEach((to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
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
})

// Home redirect guard - must run before auth guard
router.beforeEach((to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
  if (to.path === '/') {
    const logoNavigateTo = pluginConfigService.getLogoNavigateTo()
    if (logoNavigateTo && logoNavigateTo !== '/') {
      next(logoNavigateTo)
      return
    }
  }
  next()
})

// OAuth/SAML/OpenID callback handler
router.beforeEach(async (to, _from, next) => {
  const isAuthCallback = to.meta.isOAuthCallback || 
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
        logger.debug('Router', 'OAuth details', { client: clientFromPath, redirectUrl: redirectUrlFromPath })

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
router.beforeEach((to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
  // Skip auth check for OAuth/SAML/OpenID callbacks (handled by their specific guard)
  if (to.meta.isOAuthCallback || to.meta.isSAMLCallback || to.meta.isOpenIDCallback) {
    next()
    return
  }

  // Skip auth check if authentication is disabled
  if (!authConfig.userAuthenticationEnabled) {
    next()
    return
  }

  // Check if route requires authentication
  const requiresAuth = to.meta.requiresAuth === true // Default to false unless explicitly set to true

  if (requiresAuth) {
    const authStore = useAuthStore()

    // If not authenticated, show login modal and stay on current page
    // BUT only if authentication is actually enabled
    if (!authStore.isAuthenticated && authConfig.userAuthenticationEnabled) {
      logger.debug('Router', 'Route requires auth, opening login modal')
      authStore.openLoginModal()

      // Allow navigation anyway - login modal will overlay
      // This prevents redirect loops and allows the app to render
      next()
      return
    }
  }

  next()
})

/**
 * Configuration Panel Guard - Auto-close panel on navigation
 */
router.beforeEach((to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  // Auto-close config panel when navigating to a different route
  if (from.path !== to.path) {
    const uiStore = useUIStore()

    if (uiStore.configPanelState.isOpen) {
      uiStore.closeConfigPanel()
    }
  }

  next()
})

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
