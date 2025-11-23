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
              console.error('Failed to load version preview:', error)
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
              console.error('Failed to load version preview:', error)
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
      path: '/datasources/:sourceKey?/:reportType?',
      name: 'datasources',
      component: () => import('@/views/DataSourcesView.vue'),
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
        console.log('[OAuth] Token received in URL path (WebAPI pattern)')
        console.log('[OAuth] Client:', clientFromPath)
        console.log('[OAuth] Redirect URL:', redirectUrlFromPath)

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
        console.log('[OAuth] Token received in URL query')
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
        console.log('[OAuth] Token found in cookie')
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
      console.error('[OAuth] No token received from OAuth provider')
      authStore.setError('Authentication failed - no token received')
      next('/')
      return
    } catch (error) {
      console.error('[OAuth] Callback error:', error)
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
      console.log('[Router] Route requires auth, opening login modal')
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
 * Configuration Panel Guard - Auto-close panel on navigation (Feature: 013-config-panel)
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
