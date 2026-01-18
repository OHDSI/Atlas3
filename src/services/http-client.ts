/**
 * Centralized HTTP Client
 * Handles authentication, retries, and common headers for all API requests.
 */
import { logger } from '@/utils/logger'

const BASE_URL = import.meta.env.VITE_WEBAPI_URL || '/WebAPI'
const MAX_RETRY_ATTEMPTS = 3
const INITIAL_RETRY_DELAY_MS = 500

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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

async function handleAuthError(status: number): Promise<void> {
  // Only handle 401 (Unauthorized) - 403 (Forbidden) means user is authenticated but lacks permission
  if (status !== 401) {
    if (status === 403) {
      logger.warn('HttpClient', '403 Forbidden - user lacks permission for this resource')
    }
    return
  }

  try {
    const { useAuthStore } = await import('@/stores/auth')
    const { authConfig } = await import('@/config/auth.config')
    const authStore = useAuthStore()

    // Don't clear auth if we're currently authenticating (race condition protection)
    if (authStore.isAuthenticating) {
      logger.debug('HttpClient', '401 during authentication - ignoring')
      return
    }

    logger.warn('HttpClient', '401 Unauthorized - clearing auth')
    authStore.clearAuth()
    if (authConfig.userAuthenticationEnabled) {
      authStore.openLoginModal()
    }
  } catch {
    logger.debug('HttpClient', 'Store not ready for error handling')
  }
}

export interface HttpClientOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  skipAuth?: boolean
  maxRetries?: number
  initialRetryDelay?: number
}

export interface HttpClientResponse<T> {
  data: T
  status: number
  ok: boolean
}

export async function httpClient<T>(
  endpoint: string,
  options: HttpClientOptions = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  const maxRetries = options.maxRetries ?? MAX_RETRY_ATTEMPTS
  const initialDelay = options.initialRetryDelay ?? INITIAL_RETRY_DELAY_MS
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const headers = new Headers(options.headers)
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
      }
      headers.set('User-Language', getLocale())

      if (!options.skipAuth) {
        const token = await getAuthToken()
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
        }
      }

      const { body: rawBody, skipAuth: _skipAuth, maxRetries: _, initialRetryDelay: __, ...restOptions } = options
      const requestInit: RequestInit = { ...restOptions, headers }

      if (rawBody !== undefined) {
        requestInit.body = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)
      }

      const response = await fetch(url, requestInit)

      if (response.status === 401 || response.status === 403) {
        await handleAuthError(response.status)
      }

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
        if (isRetryableError(error, response.status) && attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt)
          logger.warn('HttpClient', `Request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`, error.message)
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

      if (isRetryableError(error) && attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt)
        logger.warn('HttpClient', `Network error (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`, lastError.message)
        await sleep(delay)
        continue
      }

      if (error instanceof TypeError) {
        throw new Error(`Network error: ${error.message}`)
      }
      throw error
    }
  }

  throw lastError || new Error('Request failed after all retry attempts')
}

export function httpGet<T>(endpoint: string, options?: Omit<HttpClientOptions, 'method' | 'body'>): Promise<T> {
  return httpClient<T>(endpoint, { ...options, method: 'GET' })
}

export function httpPost<T>(endpoint: string, body?: unknown, options?: Omit<HttpClientOptions, 'method' | 'body'>): Promise<T> {
  return httpClient<T>(endpoint, { ...options, method: 'POST', body })
}

export function httpPut<T>(endpoint: string, body?: unknown, options?: Omit<HttpClientOptions, 'method' | 'body'>): Promise<T> {
  return httpClient<T>(endpoint, { ...options, method: 'PUT', body })
}

export function httpDelete<T>(endpoint: string, options?: Omit<HttpClientOptions, 'method'>): Promise<T> {
  return httpClient<T>(endpoint, { ...options, method: 'DELETE' })
}

export function getBaseUrl(): string {
  return BASE_URL
}
