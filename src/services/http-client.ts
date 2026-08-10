/**
 * Centralized HTTP Client
 * Handles authentication, retries, and common headers for all API requests.
 */
import { logger } from '@/utils/logger'
import { getAppConfig } from '@/config/app-config.loader'
import { ApiError } from '@/services/api-error'
const MAX_RETRY_ATTEMPTS = 3
const INITIAL_RETRY_DELAY_MS = 500

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function mayRetry(method: string | undefined, retryNonIdempotent: boolean): boolean {
  if (retryNonIdempotent) return true
  return IDEMPOTENT_METHODS.has((method ?? 'GET').toUpperCase())
}

function isRetryableError(error: unknown, statusCode?: number): boolean {
  if (error instanceof TypeError) return true
  if (statusCode && statusCode >= 500 && statusCode < 600) return true
  if (statusCode === 429) return true
  return false
}

async function getAuthToken(): Promise<string | null> {
  try {
    const { useAuthStore } = await import('@/stores/auth')
    return useAuthStore().token
  } catch {
    return null
  }
}

function getLocale(): string {
  return localStorage.getItem('locale') || 'en'
}

async function handleAuthError(status: number, url: string): Promise<void> {
  if (status !== 401) {
    if (status === 403) {
      try {
        const { useAuthStore } = await import('@/stores/auth')
        const authStore = useAuthStore()
        logger.warn('HttpClient', '403 Forbidden', {
          url,
          userLogin: authStore.user?.login,
          hasToken: !!authStore.token,
        })
      } catch {
        logger.warn('HttpClient', '403 Forbidden', { url })
      }
    }
    return
  }

  try {
    const { useAuthStore } = await import('@/stores/auth')
    const { getAuthConfig } = await import('@/config/auth.config')
    const authStore = useAuthStore()

    if (authStore.isAuthenticating || authStore.isRefreshing) {
      return
    }

    authStore.clearAuth()
    if (getAuthConfig().userAuthenticationEnabled) {
      authStore.openLoginModal()
    }
  } catch {
    // Store not ready
  }
}

export interface HttpClientOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  skipAuth?: boolean
  maxRetries?: number
  initialRetryDelay?: number
  /**
   * Re-sending a failed POST/PUT/DELETE can duplicate a row WebAPI already
   * persisted, so writes are not retried by default. Set this only for an
   * endpoint proven idempotent server-side.
   */
  retryNonIdempotent?: boolean
}

export interface HttpClientResponse<T> {
  data: T
  status: number
  ok: boolean
}

export async function httpClient<T>(endpoint: string, options: HttpClientOptions = {}): Promise<T> {
  const url = `${getAppConfig().api.url}${endpoint}`
  const maxRetries = options.maxRetries ?? MAX_RETRY_ATTEMPTS
  const initialDelay = options.initialRetryDelay ?? INITIAL_RETRY_DELAY_MS
  const retryAllowed = mayRetry(options.method, options.retryNonIdempotent ?? false)
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const headers = new Headers(options.headers)
      headers.set('User-Language', getLocale())

      if (!options.skipAuth) {
        const token = await getAuthToken()
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
        }
      }

      const {
        body: rawBody,
        skipAuth: _skipAuth,
        maxRetries: _,
        initialRetryDelay: __,
        retryNonIdempotent: ___,
        ...restOptions
      } = options
      const requestInit: RequestInit = { ...restOptions, headers }

      // Only set Content-Type when there's a body (POST, PUT, PATCH)
      // GET requests should not have Content-Type header as they have no body
      if (rawBody !== undefined) {
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json')
        }
        requestInit.body = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)
      }

      const response = await fetch(url, requestInit)

      if (response.status === 401 || response.status === 403) {
        await handleAuthError(response.status, url)
      }

      if (!response.ok) {
        // Surface the server's error body (e.g. WebAPI's tag-assignment
        // constraint violations) instead of the bare status text, which
        // alone doesn't say what went wrong (#132).
        let detail = response.statusText
        try {
          const text = await response.text()
          if (text) {
            try {
              detail = (JSON.parse(text) as { message?: string }).message ?? text
            } catch {
              detail = text
            }
          }
        } catch {
          // keep statusText
        }
        // error.message ends up in user-facing toasts; a WebAPI error body can
        // be a full HTML stack trace, so cap it there. `body` keeps the whole
        // thing for logs.
        const summary = detail.length > 300 ? `${detail.slice(0, 300)}…` : detail
        const error = new ApiError(`HTTP ${response.status}: ${summary}`, response.status, detail)
        if (retryAllowed && isRetryableError(error, response.status) && attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt)
          logger.warn(
            'HttpClient',
            `Request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`,
            error.message
          )
          await sleep(delay)
          continue
        }
        throw error
      }

      const text = await response.text()
      if (!text || text.trim() === '') {
        return undefined as T
      }

      try {
        return JSON.parse(text) as T
      } catch (parseError) {
        logger.error('HttpClient', 'Failed to parse JSON response', parseError)
        throw new Error('Invalid response format')
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (retryAllowed && isRetryableError(error) && attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt)
        logger.warn(
          'HttpClient',
          `Network error (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`,
          lastError.message
        )
        await sleep(delay)
        continue
      }

      if (error instanceof TypeError) {
        throw new ApiError(`Network error: ${error.message}`, 0, null)
      }
      throw error
    }
  }

  throw lastError || new Error('Request failed after all retry attempts')
}

export function httpGet<T>(
  endpoint: string,
  options?: Omit<HttpClientOptions, 'method' | 'body'>
): Promise<T> {
  return httpClient<T>(endpoint, { ...options, method: 'GET' })
}

export function httpPost<T>(
  endpoint: string,
  body?: unknown,
  options?: Omit<HttpClientOptions, 'method' | 'body'>
): Promise<T> {
  return httpClient<T>(endpoint, { ...options, method: 'POST', body })
}

/**
 * A read expressed as POST — WebAPI takes the query as a JSON body. Safe to
 * retry, unlike a true write.
 */
export function httpPostRead<T>(
  endpoint: string,
  body?: unknown,
  options?: Omit<HttpClientOptions, 'method' | 'body' | 'retryNonIdempotent'>
): Promise<T> {
  return httpClient<T>(endpoint, { ...options, method: 'POST', body, retryNonIdempotent: true })
}

export function httpPut<T>(
  endpoint: string,
  body?: unknown,
  options?: Omit<HttpClientOptions, 'method' | 'body'>
): Promise<T> {
  return httpClient<T>(endpoint, { ...options, method: 'PUT', body })
}

export function httpDelete<T>(
  endpoint: string,
  options?: Omit<HttpClientOptions, 'method'>
): Promise<T> {
  return httpClient<T>(endpoint, { ...options, method: 'DELETE' })
}

export function getBaseUrl(): string {
  return getAppConfig().api.url
}
