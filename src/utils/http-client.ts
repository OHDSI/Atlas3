/**
 * HTTP Client Utility
 *
 * Provides consolidated fetch/retry logic with:
 * - Exponential backoff for retries
 * - Timeout support with AbortController
 * - JSON parsing with error handling
 * - Retryable error detection (408, 429, 500, 502, 503, 504)
 */

import { logger } from '@/utils/logger'

/**
 * Fetch options extending standard RequestInit
 */
export interface FetchOptions extends Omit<RequestInit, 'signal'> {
  maxRetries?: number // default: 3
  initialDelayMs?: number // default: 500
  timeout?: number // default: 30000
  signal?: AbortSignal
}

/**
 * Check if HTTP status code indicates a retryable error
 * @param status HTTP status code
 * @returns true if error is retryable
 */
export function isRetryableError(status: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(status)
}

/**
 * Create AbortController with optional timeout
 * @param timeoutMs Timeout in milliseconds (optional)
 * @returns AbortController instance
 */
export function createAbortController(timeoutMs?: number): AbortController {
  const controller = new AbortController()

  if (timeoutMs !== undefined && timeoutMs > 0) {
    setTimeout(() => controller.abort(), timeoutMs)
  }

  return controller
}

/**
 * Fetch JSON with retry logic and timeout support
 * @param url URL to fetch
 * @param options Fetch options with retry configuration
 * @returns Parsed JSON response
 * @throws Error on network failure, timeout, or non-retryable errors
 */
export async function fetchJSON<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 500,
    timeout = 30000,
    signal: externalSignal,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Create abort controller for this attempt
      const controller = createAbortController(timeout)

      // Combine external signal with timeout signal
      let effectiveSignal = controller.signal
      if (externalSignal) {
        // If external signal is already aborted, use it directly
        if (externalSignal.aborted) {
          throw new DOMException('Request aborted', 'AbortError')
        }

        // Listen to external signal and abort our controller
        externalSignal.addEventListener('abort', () => {
          controller.abort()
        })

        effectiveSignal = controller.signal
      }

      const response = await fetch(url, {
        ...fetchOptions,
        signal: effectiveSignal,
      })

      // Check if response is ok
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`)

        // Check if error is retryable
        if (isRetryableError(response.status) && attempt < maxRetries - 1) {
          const delay = initialDelayMs * Math.pow(2, attempt)
          logger.warn(
            'HttpClient',
            `HTTP ${response.status} (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`,
            { url, status: response.status }
          )
          lastError = error
          await sleep(delay)
          continue
        }

        throw error
      }

      // Parse JSON response
      try {
        const data = (await response.json()) as T
        return data
      } catch (parseError) {
        throw new Error(
          `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        )
      }
    } catch (error) {
      // Handle AbortError (timeout or external abort)
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Request timeout or aborted')
      }

      // Handle network errors (TypeError in fetch)
      if (error instanceof TypeError) {
        if (attempt < maxRetries - 1) {
          const delay = initialDelayMs * Math.pow(2, attempt)
          logger.warn(
            'HttpClient',
            `Network error (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`,
            error
          )
          lastError = error
          await sleep(delay)
          continue
        }

        throw new Error(`Network error after ${maxRetries} attempts: ${error.message}`)
      }

      // Re-throw non-retryable errors
      throw error
    }
  }

  // If we've exhausted retries, throw the last error
  throw lastError || new Error('Max retries exceeded')
}

/**
 * Sleep utility for retry delays
 * @param ms Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
