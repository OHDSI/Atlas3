import { useAuthStore } from '@/stores/auth'
import { logger } from '@/utils/logger'
import { authConfig } from '@/config/auth.config'

/**
 * Sets up fetch interceptor that handles 401 responses.
 * Token injection is handled by the centralized http-client.
 */
export function setupAuthInterceptor() {
  const originalFetch = window.fetch

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    try {
      const response = await originalFetch(input, init)

      if (response.status === 401) {
        // Get the URL to check if this is a refresh or auth-related request
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const isAuthRequest = url.includes('/user/refresh') || url.includes('/user/login') || url.includes('/user/me')

        // Don't handle 401 for auth-related requests - let the auth service handle those
        if (isAuthRequest) {
          logger.debug('AuthInterceptor', '401 on auth request - letting auth service handle it', { url })
          return response
        }

        try {
          const authStore = useAuthStore()
          // Don't clear auth if we're currently authenticating or refreshing (race condition protection)
          if (authStore.isAuthenticating || authStore.isRefreshing) {
            logger.debug('AuthInterceptor', '401 during auth/refresh - ignoring')
          } else {
            logger.warn('AuthInterceptor', '401 Unauthorized - clearing auth', { url })
            authStore.clearAuth()
            if (authConfig.userAuthenticationEnabled) {
              authStore.openLoginModal()
            }
          }
        } catch {
          logger.debug('AuthInterceptor', 'Store not ready for error handling')
        }
      }

      return response
    } catch (error) {
      logger.error('AuthInterceptor', 'Fetch error', error)
      throw error
    }
  }
}

export function addBearerToken(headers: HeadersInit = {}): HeadersInit {
  const authStore = useAuthStore()
  const token = authStore.token

  if (token) {
    return {
      ...headers,
      Authorization: `Bearer ${token}`,
    }
  }

  return headers
}
