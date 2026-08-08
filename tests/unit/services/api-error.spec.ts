import { describe, it, expect, vi } from 'vitest'
import { ApiError, toApiError, unwrap } from '@/services/api-error'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('ApiError', () => {
  it('carries the status and the server body', () => {
    const err = new ApiError('Forbidden', 403, 'no access to source')
    expect(err.status).toBe(403)
    expect(err.body).toBe('no access to source')
    expect(err.message).toBe('Forbidden')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('toApiError', () => {
  it('passes an ApiError through unchanged', () => {
    const original = new ApiError('Forbidden', 403, null)
    expect(toApiError(original)).toBe(original)
  })

  it('maps a plain Error to status 0', () => {
    const err = toApiError(new Error('Network error: failed to fetch'))
    expect(err.status).toBe(0)
    expect(err.message).toBe('Network error: failed to fetch')
  })

  it('maps a non-Error throw to status 0', () => {
    expect(toApiError('boom').status).toBe(0)
    expect(toApiError('boom').message).toBe('boom')
  })
})

describe('unwrap', () => {
  it('returns success with the resolved value', async () => {
    const result = await unwrap(async () => 42, 'Test')
    expect(result).toEqual({ success: true, data: 42 })
  })

  it('returns failure carrying the status', async () => {
    const result = await unwrap(async () => {
      throw new ApiError('Forbidden', 403, null)
    }, 'Test')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.status).toBe(403)
      expect(result.error.message).toBe('Forbidden')
    }
  })

  it('does not swallow a non-Error throw', async () => {
    const result = await unwrap(async () => {
      throw 'boom'
    }, 'Test')

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.message).toBe('boom')
  })
})
