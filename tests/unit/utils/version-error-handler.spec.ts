/**
 * Version Error Handler Tests
 * Tests the centralized error handling utilities for version operations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import {
  handleVersionError,
  isRetryableError,
  getErrorMessage,
  handleMissingVersion,
  getRecoverySuggestion,
  type VersionError,
} from '@/utils/version-error-handler'
import { logger } from '@/utils/logger'

describe('version-error-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleVersionError', () => {
    it('returns default UNKNOWN_ERROR for non-Error inputs', () => {
      const result = handleVersionError('something weird')

      expect(result.code).toBe('UNKNOWN_ERROR')
      expect(result.message).toBe('Unknown error occurred')
      expect(result.severity).toBe('error')
      expect(result.retry).toBe(true)
      expect(result.userMessage).toContain('unexpected')
    })

    it('preserves message field for non-Error inputs', () => {
      const result = handleVersionError(null)
      expect(result.message).toBe('Unknown error occurred')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })

    it('handles Error with 404 status as VERSION_NOT_FOUND', () => {
      const err = new Error('Request failed with status 404')
      const result = handleVersionError(err)

      expect(result.code).toBe('VERSION_NOT_FOUND')
      expect(result.message).toBe('Request failed with status 404')
      expect(result.retry).toBe(false)
      expect(result.severity).toBe('error')
    })

    it('handles Error with 401 as UNAUTHORIZED', () => {
      const err = new Error('HTTP 401 Unauthorized')
      const result = handleVersionError(err)

      expect(result.code).toBe('UNAUTHORIZED')
      expect(result.retry).toBe(false)
    })

    it('handles Error with 403 as UNAUTHORIZED', () => {
      const err = new Error('HTTP 403 Forbidden')
      const result = handleVersionError(err)

      expect(result.code).toBe('UNAUTHORIZED')
    })

    it('handles Error with 500 as SERVER_ERROR', () => {
      const err = new Error('Server returned 500')
      const result = handleVersionError(err)

      expect(result.code).toBe('SERVER_ERROR')
      expect(result.retry).toBe(true)
    })

    it('handles Error with 503 as SERVER_ERROR', () => {
      const err = new Error('Got 503 Service Unavailable')
      const result = handleVersionError(err)

      expect(result.code).toBe('SERVER_ERROR')
    })

    it('handles network errors (case-insensitive)', () => {
      const err = new Error('Network failure occurred')
      const result = handleVersionError(err)

      expect(result.code).toBe('NETWORK_ERROR')
      expect(result.retry).toBe(true)
    })

    it('handles network errors when message contains uppercase NETWORK', () => {
      const err = new Error('NETWORK timeout')
      const result = handleVersionError(err)

      expect(result.code).toBe('NETWORK_ERROR')
    })

    it('handles validation errors', () => {
      const err = new Error('Validation failed: invalid comment')
      const result = handleVersionError(err)

      expect(result.code).toBe('VALIDATION_ERROR')
      expect(result.severity).toBe('warning')
      expect(result.retry).toBe(false)
    })

    it('uses context-specific error when no match in message', () => {
      const err = new Error('something went wrong')
      const result = handleVersionError(err, 'COMMENT_SAVE_FAILED')

      expect(result.code).toBe('COMMENT_SAVE_FAILED')
      expect(result.userMessage).toContain('comment')
      expect(result.retry).toBe(true)
    })

    it('falls back to default when context is unknown', () => {
      const err = new Error('mystery error')
      const result = handleVersionError(err, 'NOT_A_REAL_CODE')

      expect(result.code).toBe('UNKNOWN_ERROR')
      expect(result.message).toBe('mystery error')
    })

    it('does not consider context if specific HTTP code matched', () => {
      const err = new Error('404 not found')
      const result = handleVersionError(err, 'COMMENT_SAVE_FAILED')

      // 404 path takes priority over context
      expect(result.code).toBe('VERSION_NOT_FOUND')
    })

    it('logs the error for debugging', () => {
      const err = new Error('boom')
      handleVersionError(err, 'COMMENT_SAVE_FAILED')

      expect(logger.error).toHaveBeenCalledWith(
        'VersionError',
        'boom',
        expect.objectContaining({ code: 'COMMENT_SAVE_FAILED', context: 'COMMENT_SAVE_FAILED' })
      )
    })

    it('logs original error in third argument', () => {
      const err = new Error('boom')
      handleVersionError(err)

      expect(logger.error).toHaveBeenCalledWith(
        'VersionError',
        expect.any(String),
        expect.objectContaining({ originalError: err })
      )
    })

    it('handles VERSION_LOAD_FAILED context', () => {
      const err = new Error('plain error')
      const result = handleVersionError(err, 'VERSION_LOAD_FAILED')

      expect(result.code).toBe('VERSION_LOAD_FAILED')
      expect(result.userMessage).toContain('version history')
    })

    it('handles VERSION_PREVIEW_FAILED context', () => {
      const err = new Error('plain error')
      const result = handleVersionError(err, 'VERSION_PREVIEW_FAILED')

      expect(result.code).toBe('VERSION_PREVIEW_FAILED')
    })

    it('handles COPY_VERSION_FAILED context', () => {
      const err = new Error('plain error')
      const result = handleVersionError(err, 'COPY_VERSION_FAILED')

      expect(result.code).toBe('COPY_VERSION_FAILED')
    })

    it('handles SAVE_AS_CURRENT_FAILED context', () => {
      const err = new Error('plain error')
      const result = handleVersionError(err, 'SAVE_AS_CURRENT_FAILED')

      expect(result.code).toBe('SAVE_AS_CURRENT_FAILED')
    })

    it('does not apply context when error is not an Error instance', () => {
      const result = handleVersionError('plain string', 'COMMENT_SAVE_FAILED')

      // Without Error instance, code stays as UNKNOWN_ERROR
      expect(result.code).toBe('UNKNOWN_ERROR')
    })
  })

  describe('isRetryableError', () => {
    it('returns true when retry is true', () => {
      const err: VersionError = {
        code: 'NETWORK_ERROR',
        message: 'x',
        userMessage: 'x',
        severity: 'error',
        retry: true,
      }
      expect(isRetryableError(err)).toBe(true)
    })

    it('returns false when retry is false', () => {
      const err: VersionError = {
        code: 'UNAUTHORIZED',
        message: 'x',
        userMessage: 'x',
        severity: 'error',
        retry: false,
      }
      expect(isRetryableError(err)).toBe(false)
    })

    it('returns false when retry is undefined', () => {
      const err: VersionError = {
        code: 'X',
        message: 'x',
        userMessage: 'x',
        severity: 'error',
      }
      expect(isRetryableError(err)).toBe(false)
    })
  })

  describe('getErrorMessage', () => {
    const baseError: VersionError = {
      code: 'NETWORK_ERROR',
      message: 'fail',
      userMessage: 'Friendly fallback',
      severity: 'error',
      retry: true,
    }

    it('returns userMessage when no translator is provided', () => {
      expect(getErrorMessage(baseError)).toBe('Friendly fallback')
    })

    it('returns translated message when translator provides one', () => {
      const t = (key: string) => (key === 'versions.errors.NETWORK_ERROR' ? 'Translated network error' : key)
      expect(getErrorMessage(baseError, t)).toBe('Translated network error')
    })

    it('falls back to userMessage when translator returns the key unchanged', () => {
      const t = (key: string) => key
      expect(getErrorMessage(baseError, t)).toBe('Friendly fallback')
    })
  })

  describe('handleMissingVersion', () => {
    it('returns a formatted VERSION_NOT_FOUND error', () => {
      const result = handleMissingVersion(7, 42)

      expect(result.code).toBe('VERSION_NOT_FOUND')
      expect(result.message).toBe('Version 7 not found')
      expect(result.userMessage).toContain('Version 7')
      expect(result.userMessage).toContain('could not be found')
      expect(result.severity).toBe('error')
      expect(result.retry).toBe(false)
    })

    it('logs a warning', () => {
      handleMissingVersion(3, 99)

      expect(logger.warn).toHaveBeenCalledWith(
        'VersionError',
        'Version 3 not found for asset 99'
      )
    })
  })

  describe('getRecoverySuggestion', () => {
    const make = (code: string, retry = true): VersionError => ({
      code,
      message: 'x',
      userMessage: 'x',
      severity: 'error',
      retry,
    })

    it('returns suggestions for VERSION_NOT_FOUND', () => {
      const suggestions = getRecoverySuggestion(make('VERSION_NOT_FOUND'))
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.toLowerCase().includes('refresh'))).toBe(true)
      expect(suggestions.some(s => s.toLowerCase().includes('administrator'))).toBe(true)
    })

    it('returns suggestions for NETWORK_ERROR', () => {
      const suggestions = getRecoverySuggestion(make('NETWORK_ERROR'))
      expect(suggestions.some(s => s.toLowerCase().includes('connection'))).toBe(true)
    })

    it('returns suggestions for UNAUTHORIZED', () => {
      const suggestions = getRecoverySuggestion(make('UNAUTHORIZED', false))
      expect(suggestions.some(s => s.toLowerCase().includes('permissions'))).toBe(true)
      expect(suggestions.some(s => s.toLowerCase().includes('administrator'))).toBe(true)
    })

    it('returns suggestions for SERVER_ERROR', () => {
      const suggestions = getRecoverySuggestion(make('SERVER_ERROR'))
      expect(suggestions.some(s => s.toLowerCase().includes('few minutes'))).toBe(true)
      expect(suggestions.some(s => s.toLowerCase().includes('support'))).toBe(true)
    })

    it('returns suggestions for VALIDATION_ERROR', () => {
      const suggestions = getRecoverySuggestion(make('VALIDATION_ERROR', false))
      expect(suggestions.some(s => s.toLowerCase().includes('500 characters'))).toBe(true)
      expect(suggestions.some(s => s.toLowerCase().includes('required'))).toBe(true)
    })

    it('returns default retry suggestion for unknown retryable error', () => {
      const suggestions = getRecoverySuggestion(make('SOMETHING_WEIRD', true))
      expect(suggestions).toContain('Try again')
      expect(suggestions.some(s => s.toLowerCase().includes('refresh'))).toBe(true)
    })

    it('omits "Try again" for unknown non-retryable error', () => {
      const suggestions = getRecoverySuggestion(make('SOMETHING_WEIRD', false))
      expect(suggestions).not.toContain('Try again')
      expect(suggestions.some(s => s.toLowerCase().includes('refresh'))).toBe(true)
    })
  })
})
