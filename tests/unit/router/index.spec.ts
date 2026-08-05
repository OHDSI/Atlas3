/**
 * Vue Router Tests
 * Tests for routing configuration, navigation guards, and OAuth/SAML/OpenID callback handling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Router } from 'vue-router'

// Mock Vue components to avoid Vuetify errors
vi.mock('@/views/LandingView.vue', () => ({
  default: { name: 'LandingView' },
}))

vi.mock('@/views/CohortsView.vue', () => ({
  default: { name: 'CohortsView' },
}))

vi.mock('@/views/CohortBuilderView.vue', () => ({
  default: { name: 'CohortBuilderView' },
}))

vi.mock('@/views/ConceptsView.vue', () => ({
  default: { name: 'ConceptsView' },
}))

vi.mock('@/views/DataSourcesView.vue', () => ({
  default: { name: 'DataSourcesView' },
}))

// Mock dependencies
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/stores/ui', () => ({
  useUIStore: vi.fn(),
}))

const mockAuthConfig = { userAuthenticationEnabled: true }
vi.mock('@/config/auth.config', () => ({
  getAuthConfig: () => mockAuthConfig,
  setAuthConfig: vi.fn(),
}))

vi.mock('@/plugins/navigation/PluginRoutes.ts', () => ({
  generatePluginRoutes: vi.fn(() => []),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/services/auth/authService', () => ({
  authService: {
    fetchUserInfo: vi.fn(),
  },
}))

import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

import { generatePluginRoutes } from '@/plugins/navigation/PluginRoutes.ts'
import { logger } from '@/utils/logger'
import { authService } from '@/services/auth/authService'

describe('Vue Router', () => {
  let router: Router
  let mockAuthStore: any
  let mockUIStore: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Mock auth store
    mockAuthStore = {
      isAuthenticated: false,
      // Steady state the guard evaluates against: the subject has been
      // resolved (user/me returned) and no authenticated/anonymous user was
      // found. The guard defers the prompt until userResolved flips true.
      userResolved: true,
      user: null,
      setToken: vi.fn(),
      setUser: vi.fn(),
      setAuthClient: vi.fn(),
      setError: vi.fn(),
      openLoginModal: vi.fn(),
    }
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)

    // Mock UI store
    mockUIStore = {
      configPanelState: {
        isOpen: false,
      },
      closeConfigPanel: vi.fn(),
    }
    vi.mocked(useUIStore).mockReturnValue(mockUIStore)

    // Mock generatePluginRoutes
    vi.mocked(generatePluginRoutes).mockReturnValue([])

    // Clear localStorage and sessionStorage
    localStorage.clear()
    sessionStorage.clear()

    // Clear cookies
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
    })

    // Import router after mocks are set up
    const routerModule = await import('@/router/index')
    router = routerModule.default

    // Reset router to initial state
    await router.push('/')
    await router.isReady()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Document Title Guard', () => {
    it('should set document.title from titleKey on navigation', async () => {
      await router.push('/cohorts')
      await router.isReady()
      expect(document.title.endsWith(' | ATLAS')).toBe(true)
    })

    it('should attach a titleKey to the home route meta', () => {
      const homeRoute = router.getRoutes().find((r) => r.name === 'home')
      expect((homeRoute?.meta as { titleKey?: string })?.titleKey).toBe('route.home.title')
    })

    it('should attach a titleKey to cohorts and concepts routes', () => {
      const cohortsRoute = router.getRoutes().find((r) => r.name === 'cohorts')
      const conceptsRoute = router.getRoutes().find((r) => r.name === 'concepts')
      expect((cohortsRoute?.meta as { titleKey?: string })?.titleKey).toBe('route.cohorts.title')
      expect((conceptsRoute?.meta as { titleKey?: string })?.titleKey).toBe('route.conceptSets.title')
    })
  })

  describe('Route Definitions', () => {
    it('should define home route', () => {
      const homeRoute = router.getRoutes().find((r) => r.name === 'home')
      expect(homeRoute).toBeDefined()
      expect(homeRoute?.path).toBe('/')
      expect(homeRoute?.meta?.requiresAuth).toBe(false)
    })

    it('should define cohorts list route', () => {
      const cohortsRoute = router.getRoutes().find((r) => r.name === 'cohorts')
      expect(cohortsRoute).toBeDefined()
      expect(cohortsRoute?.path).toBe('/cohorts')
      expect(cohortsRoute?.meta?.requiresAuth).toBe(true)
    })

    it('should define cohort new route', () => {
      const cohortNewRoute = router.getRoutes().find((r) => r.name === 'cohort-new')
      expect(cohortNewRoute).toBeDefined()
      expect(cohortNewRoute?.path).toBe('/cohorts/new')
      expect(cohortNewRoute?.meta?.requiresAuth).toBe(true)
    })

    it('should define cohort edit route with id parameter', () => {
      const cohortEditRoute = router.getRoutes().find((r) => r.name === 'cohort-edit')
      expect(cohortEditRoute).toBeDefined()
      expect(cohortEditRoute?.path).toBe('/cohorts/:id')
      expect(cohortEditRoute?.props.default).toBe(true)
      expect(cohortEditRoute?.meta?.requiresAuth).toBe(true)
    })

    it('should define concepts route', () => {
      const conceptsRoute = router.getRoutes().find((r) => r.name === 'concepts')
      expect(conceptsRoute).toBeDefined()
      expect(conceptsRoute?.path).toBe('/concepts')
      expect(conceptsRoute?.meta?.requiresAuth).toBe(true)
    })

    it('should define datasources route with optional parameters', () => {
      const datasourcesRoute = router.getRoutes().find((r) => r.name === 'datasources')
      expect(datasourcesRoute).toBeDefined()
      expect(datasourcesRoute?.path).toBe('/datasources/:sourceKey?/:reportType?')
      expect(datasourcesRoute?.props.default).toBe(true)
      expect(datasourcesRoute?.meta?.requiresAuth).toBe(true)
    })

    it('should define OAuth callback route', () => {
      const oauthCallbackRoute = router.getRoutes().find((r) => r.name === 'oauth-callback')
      expect(oauthCallbackRoute).toBeDefined()
      expect(oauthCallbackRoute?.path).toBe('/oauth/callback')
      expect(oauthCallbackRoute?.meta?.isOAuthCallback).toBe(true)
    })

    it('should define SAML callback route', () => {
      const samlCallbackRoute = router.getRoutes().find((r) => r.name === 'saml-callback')
      expect(samlCallbackRoute).toBeDefined()
      expect(samlCallbackRoute?.path).toBe('/saml/callback')
      expect(samlCallbackRoute?.meta?.isSAMLCallback).toBe(true)
    })

    it('should define OpenID callback route', () => {
      const openidCallbackRoute = router.getRoutes().find((r) => r.name === 'openid-callback')
      expect(openidCallbackRoute).toBeDefined()
      expect(openidCallbackRoute?.path).toBe('/openid/callback')
      expect(openidCallbackRoute?.meta?.isOpenIDCallback).toBe(true)
    })

    it('should define OAuth token route with dynamic parameters', () => {
      const oauthTokenRoute = router.getRoutes().find((r) => r.name === 'oauth-token')
      expect(oauthTokenRoute).toBeDefined()
      expect(oauthTokenRoute?.path).toBe('/:client/:token/:redirectUrl?')
      expect(oauthTokenRoute?.meta?.isOAuthCallback).toBe(true)
    })

    it('should have lazy-loaded components', () => {
      const homeRoute = router.getRoutes().find((r) => r.name === 'home')
      expect(homeRoute?.components?.default).toBeDefined()
      // Component is mocked as an object, not a function
      expect(homeRoute?.components?.default).toBeTruthy()
    })
  })

  describe('OAuth/SAML/OpenID Callback Handler', () => {
    beforeEach(() => {
      vi.mocked(authService.fetchUserInfo).mockResolvedValue({
        id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
      })
    })

    describe('Token in localStorage', () => {
      it('should authenticate with token from localStorage', async () => {
        localStorage.setItem('bearerToken', 'test-token-123')

        await router.push('/oauth/callback')

        expect(mockAuthStore.setToken).toHaveBeenCalledWith('test-token-123')
        expect(authService.fetchUserInfo).toHaveBeenCalled()
        expect(mockAuthStore.setUser).toHaveBeenCalled()
        expect(mockAuthStore.setAuthClient).toHaveBeenCalledWith('OpenID')
      })

      it('should ignore null localStorage token', async () => {
        localStorage.setItem('bearerToken', 'null')

        await router.push('/oauth/callback')

        expect(mockAuthStore.setToken).not.toHaveBeenCalled()
        expect(mockAuthStore.setError).toHaveBeenCalled()
      })

      it('should ignore undefined localStorage token', async () => {
        localStorage.setItem('bearerToken', 'undefined')

        await router.push('/oauth/callback')

        expect(mockAuthStore.setToken).not.toHaveBeenCalled()
        expect(mockAuthStore.setError).toHaveBeenCalled()
      })

      it('should clear destination from sessionStorage after auth', async () => {
        localStorage.setItem('bearerToken', 'test-token')
        sessionStorage.setItem('oauth_redirect_destination', '/cohorts')

        await router.push('/oauth/callback')

        // Verify auth was completed
        expect(mockAuthStore.setToken).toHaveBeenCalledWith('test-token')
        expect(sessionStorage.getItem('oauth_redirect_destination')).toBeNull()
      })

      it('should authenticate without stored destination', async () => {
        localStorage.setItem('bearerToken', 'test-token')

        await router.push('/oauth/callback')

        expect(mockAuthStore.setToken).toHaveBeenCalledWith('test-token')
        expect(authService.fetchUserInfo).toHaveBeenCalled()
      })
    })

    describe('Token in URL path', () => {
      it('should authenticate with token from URL path', async () => {
        await router.push('/GoogleIAP/test-token-456')

        expect(mockAuthStore.setToken).toHaveBeenCalledWith('test-token-456')
        expect(authService.fetchUserInfo).toHaveBeenCalled()
        expect(mockAuthStore.setUser).toHaveBeenCalled()
        expect(mockAuthStore.setAuthClient).toHaveBeenCalledWith('GoogleIAP')
        expect(logger.info).toHaveBeenCalledWith(
          'Router',
          'Token received in URL path (WebAPI pattern)'
        )
      })

      it('should handle redirectUrl from path parameter', async () => {
        const redirectUrl = encodeURIComponent('/cohorts/123')
        await router.push(`/GoogleIAP/test-token/${redirectUrl}`)

        expect(mockAuthStore.setToken).toHaveBeenCalledWith('test-token')
        expect(authService.fetchUserInfo).toHaveBeenCalled()
      })

      it('should clear sessionStorage when no redirectUrl in path', async () => {
        sessionStorage.setItem('oauth_redirect_destination', '/concepts')
        await router.push('/GoogleIAP/test-token')

        expect(mockAuthStore.setToken).toHaveBeenCalledWith('test-token')
        expect(sessionStorage.getItem('oauth_redirect_destination')).toBeNull()
      })

      it('should use redirectUrl from path parameter', async () => {
        const redirectUrl = encodeURIComponent('/datasources')
        await router.push(`/GoogleIAP/test-token/${redirectUrl}`)

        // Check token was set
        expect(mockAuthStore.setToken).toHaveBeenCalledWith('test-token')
        expect(authService.fetchUserInfo).toHaveBeenCalled()
      })
    })

    describe('Token in URL query', () => {
      it('should authenticate with token from query parameter', async () => {
        await router.push('/oauth/callback?token=test-query-token')

        expect(mockAuthStore.setToken).toHaveBeenCalledWith('test-query-token')
        expect(authService.fetchUserInfo).toHaveBeenCalled()
        expect(mockAuthStore.setUser).toHaveBeenCalled()
        expect(logger.info).toHaveBeenCalledWith('Router', 'Token received in URL query')
      })

      it('should clear sessionStorage after query token auth', async () => {
        sessionStorage.setItem('oauth_redirect_destination', '/datasources')
        await router.push('/oauth/callback?token=test-query-token')

        expect(mockAuthStore.setToken).toHaveBeenCalledWith('test-query-token')
        expect(sessionStorage.getItem('oauth_redirect_destination')).toBeNull()
      })
    })

    describe('Token in cookies', () => {
      it('should authenticate with token from cookie', async () => {
        document.cookie = 'bearerToken=test-cookie-token; path=/'

        await router.push('/oauth/callback')

        expect(mockAuthStore.setToken).toHaveBeenCalledWith('test-cookie-token')
        expect(authService.fetchUserInfo).toHaveBeenCalled()
        expect(mockAuthStore.setUser).toHaveBeenCalled()
        expect(logger.info).toHaveBeenCalledWith('Router', 'Token found in cookie')
      })

      it('should clear cookie after authentication', async () => {
        document.cookie = 'bearerToken=test-cookie-token; path=/'

        await router.push('/oauth/callback')

        // Cookie should be cleared
        const cookieExists = document.cookie.includes('bearerToken=test-cookie-token')
        expect(cookieExists).toBe(false)
      })

      it('should clear sessionStorage after cookie auth', async () => {
        document.cookie = 'bearerToken=test-cookie-token; path=/'
        sessionStorage.setItem('oauth_redirect_destination', '/cohorts/new')

        await router.push('/oauth/callback')

        expect(mockAuthStore.setToken).toHaveBeenCalledWith('test-cookie-token')
        expect(sessionStorage.getItem('oauth_redirect_destination')).toBeNull()
      })
    })

    describe('Error handling', () => {
      it('should handle missing token', async () => {
        await router.push('/oauth/callback')

        expect(logger.error).toHaveBeenCalledWith(
          'Router',
          'No token received from OAuth provider'
        )
        expect(mockAuthStore.setError).toHaveBeenCalledWith(
          'Authentication failed - no token received'
        )
      })

      it('should handle fetchUserInfo error', async () => {
        localStorage.setItem('bearerToken', 'test-token')
        const error = new Error('Network error')
        vi.mocked(authService.fetchUserInfo).mockRejectedValue(error)

        await router.push('/oauth/callback')

        expect(logger.error).toHaveBeenCalledWith('Router', 'OAuth callback error', error)
        expect(mockAuthStore.setError).toHaveBeenCalledWith('Network error')
      })

      it('should handle non-Error exceptions', async () => {
        localStorage.setItem('bearerToken', 'test-token')
        vi.mocked(authService.fetchUserInfo).mockRejectedValue('string error')

        await router.push('/oauth/callback')

        expect(mockAuthStore.setError).toHaveBeenCalledWith('Authentication failed')
      })
    })

    describe('Different callback paths', () => {
      it('should handle /saml/callback', async () => {
        localStorage.setItem('bearerToken', 'saml-token')

        await router.push('/saml/callback')

        expect(mockAuthStore.setToken).toHaveBeenCalledWith('saml-token')
        expect(authService.fetchUserInfo).toHaveBeenCalled()
      })

      it('should handle /openid/callback', async () => {
        localStorage.setItem('bearerToken', 'openid-token')

        await router.push('/openid/callback')

        expect(mockAuthStore.setToken).toHaveBeenCalledWith('openid-token')
        expect(authService.fetchUserInfo).toHaveBeenCalled()
      })
    })
  })

  describe('Authentication Guard', () => {
    beforeEach(() => {
      // Reset auth config
      mockAuthConfig.userAuthenticationEnabled = true
    })

    it('should allow access to public routes without authentication', async () => {
      mockAuthStore.isAuthenticated = false

      await router.push('/')

      expect(mockAuthStore.openLoginModal).not.toHaveBeenCalled()
      expect(router.currentRoute.value.path).toBe('/')
    })

    it('should open login modal for protected routes when not authenticated', async () => {
      mockAuthStore.isAuthenticated = false

      await router.push('/cohorts')

      expect(mockAuthStore.openLoginModal).toHaveBeenCalled()
    })

    it('should allow access to protected routes when authenticated', async () => {
      mockAuthStore.isAuthenticated = true

      await router.push('/cohorts')

      expect(mockAuthStore.openLoginModal).not.toHaveBeenCalled()
    })

    it('should defer the login modal until the subject is resolved', async () => {
      mockAuthStore.isAuthenticated = false
      mockAuthStore.userResolved = false

      await router.push('/cohorts')

      expect(mockAuthStore.openLoginModal).not.toHaveBeenCalled()
    })

    it('should not open login modal for an anonymous subject with access', async () => {
      mockAuthStore.isAuthenticated = false
      mockAuthStore.userResolved = true
      mockAuthStore.user = { login: 'anonymous' }

      await router.push('/cohorts')

      expect(mockAuthStore.openLoginModal).not.toHaveBeenCalled()
    })

    it('should skip auth check when authentication is disabled', async () => {
      mockAuthConfig.userAuthenticationEnabled = false
      mockAuthStore.isAuthenticated = false

      await router.push('/cohorts')

      expect(mockAuthStore.openLoginModal).not.toHaveBeenCalled()
    })

    it('should skip auth check for OAuth callback routes', async () => {
      mockAuthStore.isAuthenticated = false

      await router.push('/oauth/callback')

      expect(mockAuthStore.openLoginModal).not.toHaveBeenCalled()
    })

    it('should skip auth check for SAML callback routes', async () => {
      mockAuthStore.isAuthenticated = false

      await router.push('/saml/callback')

      expect(mockAuthStore.openLoginModal).not.toHaveBeenCalled()
    })

    it('should skip auth check for OpenID callback routes', async () => {
      mockAuthStore.isAuthenticated = false

      await router.push('/openid/callback')

      expect(mockAuthStore.openLoginModal).not.toHaveBeenCalled()
    })

    it('should log debug message when opening login modal', async () => {
      mockAuthStore.isAuthenticated = false

      await router.push('/cohorts')

      expect(logger.debug).toHaveBeenCalledWith(
        'Router',
        'Route requires auth, opening login modal'
      )
    })
  })

  describe('Configuration Panel Guard', () => {
    it('should close config panel when navigating to different route', async () => {
      mockUIStore.configPanelState.isOpen = true

      await router.push('/')
      await router.push('/cohorts')

      expect(mockUIStore.closeConfigPanel).toHaveBeenCalled()
    })

    it('should attempt navigation even with same route', async () => {
      mockUIStore.configPanelState.isOpen = true

      await router.push('/cohorts')

      // Duplicate navigation will be prevented by router
      // This is expected behavior - the guard still runs once
      expect(mockUIStore.closeConfigPanel).toHaveBeenCalled()
    })

    it('should not call closeConfigPanel when panel is already closed', async () => {
      mockUIStore.configPanelState.isOpen = false
      vi.clearAllMocks()

      await router.push('/')
      await router.push('/cohorts')

      expect(mockUIStore.closeConfigPanel).not.toHaveBeenCalled()
    })

    it('should close config panel when path changes', async () => {
      mockUIStore.configPanelState.isOpen = true
      vi.clearAllMocks()

      await router.push('/cohorts')
      await router.push('/concepts')

      expect(mockUIStore.closeConfigPanel).toHaveBeenCalled()
    })
  })

  describe('Plugin Routes', () => {
    it('should have generatePluginRoutes mocked', () => {
      // generatePluginRoutes is mocked to return empty array
      // This prevents actual plugin routes from being loaded during tests
      const result = generatePluginRoutes()
      expect(result).toEqual([])
    })

    it('should not have any plugin routes in test environment', () => {
      // Since we mock generatePluginRoutes to return [], no plugin routes should exist
      const pluginRoutes = router.getRoutes().filter(r => r.meta?.isPluginRoute)
      expect(pluginRoutes).toHaveLength(0)
    })
  })

  describe('Route Navigation', () => {
    it('should resolve cohort edit route with id parameter', () => {
      const route = router.resolve({ name: 'cohort-edit', params: { id: '123' } })

      expect(route.name).toBe('cohort-edit')
      expect(route.params.id).toBe('123')
    })

    it('should resolve datasources route with optional parameters', () => {
      const route = router.resolve({
        name: 'datasources',
        params: { sourceKey: 'source1', reportType: 'report1' },
      })

      expect(route.name).toBe('datasources')
      expect(route.params.sourceKey).toBe('source1')
      expect(route.params.reportType).toBe('report1')
    })

    it('should pass params to routes with props:true', () => {
      const route = router.resolve({ name: 'cohort-edit', params: { id: 'abc' } })

      expect(route.params.id).toBe('abc')
    })

    it('resolves the analysis plugin tab route', () => {
      const resolved = router.resolve('/analysis/x/p1/my-tab')
      expect(resolved.name).toBe('analysis-plugin')
      expect(resolved.params).toEqual({ pluginId: 'p1', itemId: 'my-tab' })
    })
  })

  describe('History Mode', () => {
    it('should use web history mode', () => {
      expect(router.options.history).toBeDefined()
      // WebHistory doesn't have a specific type check, but we can verify it's not hash mode
      expect(router.options.history.base).toBeDefined()
    })
  })

  describe('getCookieToken utility', () => {
    it('should extract token from cookies', async () => {
      document.cookie = 'bearerToken=cookie-test-token; path=/'
      document.cookie = 'other=value; path=/'

      await router.push('/oauth/callback')

      expect(mockAuthStore.setToken).toHaveBeenCalledWith('cookie-test-token')
    })

    it('should handle URL encoded cookie values', async () => {
      const encodedToken = encodeURIComponent('token with spaces')
      document.cookie = `bearerToken=${encodedToken}; path=/`

      await router.push('/oauth/callback')

      expect(mockAuthStore.setToken).toHaveBeenCalledWith('token with spaces')
    })

    it('should return null when cookie not found', async () => {
      document.cookie = 'other=value; path=/'

      await router.push('/oauth/callback')

      expect(mockAuthStore.setToken).not.toHaveBeenCalled()
      expect(mockAuthStore.setError).toHaveBeenCalled()
    })
  })

  describe('Navigation Guard Order', () => {
    it('should execute OAuth callback handler before auth guard', async () => {
      localStorage.setItem('bearerToken', 'test-token')
      mockAuthStore.isAuthenticated = false

      await router.push('/oauth/callback')

      // Should set token (OAuth handler) before checking auth (auth guard)
      expect(mockAuthStore.setToken).toHaveBeenCalledWith('test-token')
      expect(mockAuthStore.openLoginModal).not.toHaveBeenCalled()
    })

    it('should execute config panel guard on navigation', async () => {
      mockAuthStore.isAuthenticated = true
      mockUIStore.configPanelState.isOpen = true
      vi.clearAllMocks()

      await router.push('/')
      await router.push('/cohorts')

      // Config panel guard should execute
      expect(mockUIStore.closeConfigPanel).toHaveBeenCalled()
    })
  })
})
