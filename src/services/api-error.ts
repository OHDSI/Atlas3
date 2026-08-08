import { logger } from '@/utils/logger'
import { type ApiResult, success, failure } from '@/types/api'

export class ApiError extends Error {
  readonly status: number
  readonly body: string | null

  constructor(message: string, status: number, body: string | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (err instanceof Error) return new ApiError(err.message, 0, null)
  return new ApiError(String(err), 0, null)
}

export async function unwrap<T>(fn: () => Promise<T>, context: string): Promise<ApiResult<T>> {
  try {
    return success(await fn())
  } catch (err) {
    const apiError = toApiError(err)
    logger.error(context, apiError.message, apiError)
    return failure(apiError)
  }
}

/**
 * The WebAPI list endpoint may return either a bare array or a Spring
 * Data-style page wrapper `{ content: [...] }`. Normalise to a plain array.
 */
export function unwrapList<T = unknown>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (
    payload !== null &&
    typeof payload === 'object' &&
    Array.isArray((payload as { content?: unknown }).content)
  ) {
    return (payload as { content: T[] }).content
  }
  return []
}
