import { useAuthStore } from '@/stores/auth'

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
          requestInit.headers = new Headers(requestInit.headers || {})
          requestInit.headers.set('Authorization', `Bearer ${token}`)
        }
      } catch (e) {
        // Store not ready yet, continue without token
        console.debug('[Auth Interceptor] Store not ready, skipping token injection')
      }

      // Make the actual fetch request
      const response = await originalFetch(input, requestInit)

      // Handle authentication errors (but don't fail if store not ready)
      try {
        const authStore = useAuthStore()
        
        if (response.status === 401) {
          console.warn('[Auth Interceptor] 401 Unauthorized - clearing auth')
          authStore.clearAuth()
          authStore.openLoginModal()
        } else if (response.status === 403) {
          console.warn('[Auth Interceptor] 403 Forbidden - attempting token refresh')
          await authStore.performTokenRefresh()
        }
      } catch (e) {
        console.debug('[Auth Interceptor] Store not ready for error handling')
      }

      return response
    } catch (error) {
      console.error('[Auth Interceptor] Fetch error:', error)
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
