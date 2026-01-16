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
        try {
          const authStore = useAuthStore()
          logger.warn('AuthInterceptor', '401 Unauthorized - clearing auth')
          authStore.clearAuth()
          if (authConfig.userAuthenticationEnabled) {
            authStore.openLoginModal()
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
