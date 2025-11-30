import { useAuthStore } from '@/stores/auth'
import { getTokenExpiration } from '@/utils/jwt'
import { tokenRefreshService } from './tokenRefresh'
import { logger } from '@/utils/logger'

export function setupAuthInterceptor() {
  const originalFetch = window.fetch

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    try {
      // Clone init to avoid modifying the original
      const requestInit: RequestInit = { ...init }

      // Try to add auth token if available (but don't fail if store not ready)
      try {
        const authStore = useAuthStore()
        const token = authStore.token

        if (token) {
          // Check if token needs refresh before request
          const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
          const isRefreshEndpoint = url?.includes('/user/refresh')
          
          if (!isRefreshEndpoint) {
            const expiration = getTokenExpiration(token)
            
            if (expiration) {
              const now = new Date()
              const minutesUntilExpiry = (expiration.getTime() - now.getTime()) / (60 * 1000)

              // Refresh if less than 5 minutes remaining
              if (minutesUntilExpiry < 5 && minutesUntilExpiry > 0) {
                logger.debug('AuthInterceptor', `Token expiring in ${minutesUntilExpiry.toFixed(1)} minutes, refreshing...`)
                await tokenRefreshService.refreshToken()
                // Get updated token after refresh
                const refreshedToken = authStore.token
                if (refreshedToken) {
                  requestInit.headers = new Headers(requestInit.headers || {})
                  requestInit.headers.set('Authorization', `Bearer ${refreshedToken}`)
                }
              } else {
                requestInit.headers = new Headers(requestInit.headers || {})
                requestInit.headers.set('Authorization', `Bearer ${token}`)
              }
            } else {
              requestInit.headers = new Headers(requestInit.headers || {})
              requestInit.headers.set('Authorization', `Bearer ${token}`)
            }
          } else {
            // For refresh endpoint, use current token
            requestInit.headers = new Headers(requestInit.headers || {})
            requestInit.headers.set('Authorization', `Bearer ${token}`)
          }
        }
      } catch (e) {
        // Store not ready yet, continue without token
        logger.debug('AuthInterceptor', 'Store not ready, skipping token injection')
      }

      // Make the actual fetch request
      const response = await originalFetch(input, requestInit)

      // Handle authentication errors
      try {
        const authStore = useAuthStore()
        
        if (response.status === 401) {
          logger.warn('AuthInterceptor', '401 Unauthorized - clearing auth')
          authStore.clearAuth()
          authStore.openLoginModal()
        } else if (response.status === 403) {
          logger.warn('AuthInterceptor', '403 Forbidden - attempting token refresh')
          await authStore.performTokenRefresh()
        }
      } catch (e) {
        logger.debug('AuthInterceptor', 'Store not ready for error handling')
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
