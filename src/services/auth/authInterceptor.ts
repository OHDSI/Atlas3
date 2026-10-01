import { useAuthStore } from '@/stores/auth'
import { logger } from '@/utils/logger'
import { getAuthConfig } from '@/config/auth.config'
import { getWebAPIBaseUrl } from '@/config/webapi'

/**
 * Only a 401 from the WebAPI means the Atlas session is gone. Plugin and
 * sibling-service endpoints share the global fetch but have their own auth.
 */
function isWebAPIRequest(url: string): boolean {
  try {
    const base = new URL(getWebAPIBaseUrl(), window.location.href)
    const target = new URL(url, window.location.href)
    const basePath = base.pathname.replace(/\/+$/, '')
    return (
      target.origin === base.origin &&
      (target.pathname === basePath || target.pathname.startsWith(`${basePath}/`))
    )
  } catch {
    return false
  }
}

/**
 * Sets up fetch interceptor that handles 401 responses from the WebAPI.
 * Token injection is handled by the centralized http-client.
 */
export function setupAuthInterceptor() {
  const originalFetch = window.fetch

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    try {
      const response = await originalFetch(input, init)

      if (response.status === 401) {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const isAuthRequest =
          url.includes('/user/refresh') || url.includes('/user/login') || url.includes('/user/me')

        if (isAuthRequest || !isWebAPIRequest(url)) {
          return response
        }

        try {
          const authStore = useAuthStore()
          if (!authStore.isAuthenticating && !authStore.isRefreshing) {
            authStore.clearAuth()
            if (getAuthConfig().userAuthenticationEnabled) {
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
