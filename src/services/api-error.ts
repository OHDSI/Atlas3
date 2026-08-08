import type { ZodError } from 'zod'
import { logger } from '@/utils/logger'
import { type ApiResult, success, failure } from '@/types/api'

/**
 * Serialise a Zod failure into ApiError's `body` carrier. `issues` (field
 * paths + messages) is what's actually useful when read from a log or
 * surfaced in a report; the full ZodError also carries a redundant `message`
 * string and internal `_ctx`, which just adds noise.
 */
export function zodIssues(error: ZodError): string {
  return JSON.stringify(error.issues)
}

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
 * Anything else (SSO-redirect JSON, an error body served with HTTP 200) is
 * not "an empty list" — throw so the caller's unwrap() surfaces it.
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
  throw new ApiError(
    'Expected a list response but got a different shape',
    0,
    JSON.stringify(payload) ?? String(payload)
  )
}
