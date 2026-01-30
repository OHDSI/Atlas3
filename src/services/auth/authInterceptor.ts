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
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const isAuthRequest = url.includes('/user/refresh') || url.includes('/user/login') || url.includes('/user/me')

        if (isAuthRequest) {
          return response
        }

        try {
          const authStore = useAuthStore()
          if (!authStore.isAuthenticating && !authStore.isRefreshing) {
            authStore.clearAuth()
            if (authConfig.userAuthenticationEnabled) {
              authStore.openLoginModal()
            }
          }
        } catch {
          // Store not ready
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
