import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { ApiError, toApiError, unwrap, unwrapList, parseOrThrow } from '@/services/api-error'

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

describe('parseOrThrow', () => {
  const schema = z.object({ id: z.number(), name: z.string() })

  it('returns the parsed data when the schema passes', () => {
    expect(parseOrThrow(schema, { id: 1, name: 'A' }, 'Invalid')).toEqual({ id: 1, name: 'A' })
  })

  it('throws an ApiError carrying the Zod issues in body', () => {
    let thrown: unknown
    try {
      parseOrThrow(schema, { id: 'nope' }, 'Invalid response from /thing')
    } catch (err) {
      thrown = err
    }

    expect(thrown).toBeInstanceOf(ApiError)
    const apiError = thrown as ApiError
    expect(apiError.message).toBe('Invalid response from /thing')
    expect(apiError.status).toBe(0)
    const issues = JSON.parse(apiError.body as string)
    expect(issues.some((i: { path: string[] }) => i.path.includes('id'))).toBe(true)
    expect(issues.some((i: { path: string[] }) => i.path.includes('name'))).toBe(true)
  })
})

describe('unwrapList', () => {
  it('passes a bare array through', () => {
    expect(unwrapList([{ id: 1 }, { id: 2 }])).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('passes an empty array through rather than treating it as a bad shape', () => {
    expect(unwrapList([])).toEqual([])
  })

  it('unwraps a Spring Data `{ content: [...] }` page wrapper', () => {
    expect(unwrapList({ content: [{ id: 5 }], totalElements: 1 })).toEqual([{ id: 5 }])
  })

  it('throws an ApiError carrying the payload when given a plain object', () => {
    let thrown: unknown
    try {
      unwrapList({ redirect: '/sso/login' })
    } catch (err) {
      thrown = err
    }

    expect(thrown).toBeInstanceOf(ApiError)
    const apiError = thrown as ApiError
    expect(apiError.message).toBe('Expected a list response but got a different shape')
    expect(apiError.status).toBe(0)
    expect(JSON.parse(apiError.body as string)).toEqual({ redirect: '/sso/login' })
  })

  it('throws when `content` is present but not an array', () => {
    expect(() => unwrapList({ content: null })).toThrow(ApiError)
    expect(() => unwrapList({ content: null })).toThrow(
      'Expected a list response but got a different shape'
    )
  })

  it('throws for a null payload', () => {
    expect(() => unwrapList(null)).toThrow(ApiError)
  })

  it('stringifies an unserialisable payload for the error body', () => {
    let thrown: unknown
    try {
      unwrapList(undefined)
    } catch (err) {
      thrown = err
    }

    expect((thrown as ApiError).body).toBe('undefined')
  })
})
