/**
 * API Result Types
 *
 * Discriminated union types for explicit error handling in API calls.
 */
import type { ApiError } from '@/services/api-error'

/**
 * Represents the result of an API call that can either succeed with data
 * or fail with error information.
 *
 * @example
 * ```typescript
 * async function fetchData(): Promise<ApiResult<Data[]>> {
 *   try {
 *     const response = await fetch(url)
 *     if (!response.ok) {
 *       return { success: false, error: response.statusText }
 *     }
 *     return { success: true, data: await response.json() }
 *   } catch (e) {
 *     return { success: false, error: e.message }
 *   }
 * }
 *
 * // Usage
 * const result = await fetchData()
 * if (result.success) {
 *   doSomething(result.data) // TypeScript knows data is available
 * } else {
 *   showError(result.error) // TypeScript knows error is available
 * }
 * ```
 */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError }

/**
 * Tracks active requests for cancellation on navigation.
 */
export interface RequestController {
  /** AbortController for the current request */
  controller: AbortController | null
  /** Unique identifier for request tracking */
  requestId: string | null
}

/**
 * Helper function to create a successful API result.
 */
export function success<T>(data: T): ApiResult<T> {
  return { success: true, data }
}

/**
 * Helper function to create a failed API result.
 */
export function failure<T>(error: ApiError): ApiResult<T>
export function failure<T>(error: string, code?: string): ApiResult<T>
export function failure<T>(error: ApiError | string, code?: string): ApiResult<T> {
  if (typeof error !== 'string') return { success: false, error }
  // Shaped by hand rather than via `new ApiError(...)`: importing the class as
  // a value here would close the api.ts → api-error.ts → api.ts cycle.
  const wrapped = Object.assign(new Error(error), {
    name: 'ApiError',
    status: 0,
    body: code ?? null,
  }) as ApiError
  return { success: false, error: wrapped }
}
