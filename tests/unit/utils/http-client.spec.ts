/**
 * Unit Tests: HTTP Client Utility
 * Tests for src/utils/http-client.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fetchJSON, isRetryableError, createAbortController } from '@/utils/http-client'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('http-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('isRetryableError', () => {
    it('returns true for 408 Request Timeout', () => {
      expect(isRetryableError(408)).toBe(true)
    })

    it('returns true for 429 Too Many Requests', () => {
      expect(isRetryableError(429)).toBe(true)
    })

    it('returns true for 500 Internal Server Error', () => {
      expect(isRetryableError(500)).toBe(true)
    })

    it('returns true for 502 Bad Gateway', () => {
      expect(isRetryableError(502)).toBe(true)
    })

    it('returns true for 503 Service Unavailable', () => {
      expect(isRetryableError(503)).toBe(true)
    })

    it('returns true for 504 Gateway Timeout', () => {
      expect(isRetryableError(504)).toBe(true)
    })

    it('returns false for 400 Bad Request', () => {
      expect(isRetryableError(400)).toBe(false)
    })

    it('returns false for 401 Unauthorized', () => {
      expect(isRetryableError(401)).toBe(false)
    })

    it('returns false for 404 Not Found', () => {
      expect(isRetryableError(404)).toBe(false)
    })

    it('returns false for 200 OK', () => {
      expect(isRetryableError(200)).toBe(false)
    })
  })

  describe('createAbortController', () => {
    it('creates an AbortController without timeout', () => {
      const controller = createAbortController()
      expect(controller).toBeInstanceOf(AbortController)
      expect(controller.signal.aborted).toBe(false)
    })

    it('creates an AbortController with timeout', async () => {
      const controller = createAbortController(100)
      expect(controller.signal.aborted).toBe(false)

      // Advance time to trigger timeout
      await vi.advanceTimersByTimeAsync(100)

      expect(controller.signal.aborted).toBe(true)
    })

    it('does not set timeout for 0ms', () => {
      const controller = createAbortController(0)
      expect(controller.signal.aborted).toBe(false)
    })

    it('does not set timeout for negative values', () => {
      const controller = createAbortController(-100)
      expect(controller.signal.aborted).toBe(false)
    })
  })

  describe('fetchJSON - successful requests', () => {
    it('fetches and parses JSON successfully', async () => {
      const mockData = { id: 1, name: 'Test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      const result = await fetchJSON<typeof mockData>('https://api.example.com/data')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({})
      )
      expect(result).toEqual(mockData)
    })

    it('passes fetch options to underlying fetch call', async () => {
      const mockData = { success: true }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      await fetchJSON('https://api.example.com/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true })
        })
      )
    })

    it('handles empty JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null
      })

      const result = await fetchJSON('https://api.example.com/data')
      expect(result).toBeNull()
    })

    it('handles array JSON response', async () => {
      const mockData = [1, 2, 3, 4, 5]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      const result = await fetchJSON<number[]>('https://api.example.com/data')
      expect(result).toEqual(mockData)
    })
  })

  describe('fetchJSON - retry on retryable errors', () => {
    it('retries on 500 Internal Server Error', async () => {
      const mockData = { success: true }

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData
        })

      const promise = fetchJSON('https://api.example.com/data')

      // Wait for first retry delay (500ms)
      await vi.advanceTimersByTimeAsync(500)

      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockData)
    })

    it('retries on 502 Bad Gateway', async () => {
      const mockData = { success: true }

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData
        })

      const promise = fetchJSON('https://api.example.com/data')
      await vi.advanceTimersByTimeAsync(500)

      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockData)
    })

    it('retries on 503 Service Unavailable', async () => {
      const mockData = { success: true }

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData
        })

      const promise = fetchJSON('https://api.example.com/data')
      await vi.advanceTimersByTimeAsync(500)

      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockData)
    })

    it('retries on 504 Gateway Timeout', async () => {
      const mockData = { success: true }

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 504,
          statusText: 'Gateway Timeout'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData
        })

      const promise = fetchJSON('https://api.example.com/data')
      await vi.advanceTimersByTimeAsync(500)

      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockData)
    })

    it('retries on 429 Too Many Requests', async () => {
      const mockData = { success: true }

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData
        })

      const promise = fetchJSON('https://api.example.com/data')
      await vi.advanceTimersByTimeAsync(500)

      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockData)
    })

    it('retries on 408 Request Timeout', async () => {
      const mockData = { success: true }

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 408,
          statusText: 'Request Timeout'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData
        })

      const promise = fetchJSON('https://api.example.com/data')
      await vi.advanceTimersByTimeAsync(500)

      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockData)
    })

    it('retries on network error (TypeError)', async () => {
      const mockData = { success: true }

      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData
        })

      const promise = fetchJSON('https://api.example.com/data')
      await vi.advanceTimersByTimeAsync(500)

      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockData)
    })
  })

  describe('fetchJSON - max retry limit', () => {
    it('fails after reaching max retries (default 3)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const promise = fetchJSON('https://api.example.com/data').catch(err => err)

      // Advance through all retry attempts
      await vi.advanceTimersByTimeAsync(500)  // First retry
      await vi.advanceTimersByTimeAsync(1000) // Second retry

      const error = await promise

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain('HTTP 500')
    })

    it('respects custom maxRetries option', async () => {
      const mockData = { success: true }

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData
        })

      const promise = fetchJSON('https://api.example.com/data', { maxRetries: 2 })
      await vi.advanceTimersByTimeAsync(500)

      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockData)
    })

    it('does not retry when maxRetries is 1', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(
        fetchJSON('https://api.example.com/data', { maxRetries: 1 })
      ).rejects.toThrow('HTTP 500')

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('fetchJSON - exponential backoff', () => {
    it('uses exponential backoff delays (500ms, 1000ms, 2000ms)', async () => {
      const delays: number[] = []
      let lastTime: number | null = null

      mockFetch.mockImplementation(() => {
        const currentTime = Date.now()
        if (lastTime !== null) {
          delays.push(currentTime - lastTime)
        }
        lastTime = currentTime
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
      })

      const promise = fetchJSON('https://api.example.com/data', { maxRetries: 4 }).catch(() => {})

      // First attempt (no delay)
      await vi.advanceTimersByTimeAsync(0)

      // First retry after 500ms
      await vi.advanceTimersByTimeAsync(500)

      // Second retry after 1000ms
      await vi.advanceTimersByTimeAsync(1000)

      // Third retry after 2000ms
      await vi.advanceTimersByTimeAsync(2000)

      await promise

      expect(delays[0]).toBeGreaterThanOrEqual(500)
      expect(delays[0]).toBeLessThan(600)
      expect(delays[1]).toBeGreaterThanOrEqual(1000)
      expect(delays[1]).toBeLessThan(1100)
      expect(delays[2]).toBeGreaterThanOrEqual(2000)
      expect(delays[2]).toBeLessThan(2100)
    })

    it('respects custom initialDelayMs option', async () => {
      const mockData = { success: true }

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData
        })

      const promise = fetchJSON('https://api.example.com/data', { initialDelayMs: 1000 })

      // Should wait 1000ms for first retry (not 500ms)
      await vi.advanceTimersByTimeAsync(1000)

      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockData)
    })
  })

  describe('fetchJSON - timeout handling', () => {
    it('times out after default 30 seconds', async () => {
      mockFetch.mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          // Simulate abort by listening to the signal
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('Request aborted', 'AbortError'))
            })
          }
        })
      })

      const promise = fetchJSON('https://api.example.com/data').catch(err => err)

      // Advance to timeout
      await vi.advanceTimersByTimeAsync(30000)

      const error = await promise

      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain('timeout')
    })

    it('respects custom timeout option', async () => {
      mockFetch.mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('Request aborted', 'AbortError'))
            })
          }
        })
      })

      const promise = fetchJSON('https://api.example.com/data', { timeout: 5000 }).catch(err => err)

      // Advance to custom timeout
      await vi.advanceTimersByTimeAsync(5000)

      const error = await promise

      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain('timeout')
    })

    it('completes successfully before timeout', async () => {
      const mockData = { success: true }

      mockFetch.mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: async () => mockData
        })
      })

      const result = await fetchJSON('https://api.example.com/data', { timeout: 5000 })

      expect(result).toEqual(mockData)
    })
  })

  describe('fetchJSON - abort signal support', () => {
    it('supports external abort signal', async () => {
      const controller = new AbortController()

      mockFetch.mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('Request aborted', 'AbortError'))
            })
          }
        })
      })

      const promise = fetchJSON('https://api.example.com/data', {
        signal: controller.signal
      }).catch(err => err)

      // Abort the request
      controller.abort()
      await vi.advanceTimersByTimeAsync(0)

      const error = await promise

      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain('aborted')
    })

    it('handles already-aborted signal', async () => {
      const controller = new AbortController()
      controller.abort()

      await expect(
        fetchJSON('https://api.example.com/data', { signal: controller.signal })
      ).rejects.toThrow('aborted')

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('combines external signal with timeout', async () => {
      const controller = new AbortController()

      mockFetch.mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('Request aborted', 'AbortError'))
            })
          }
        })
      })

      const promise = fetchJSON('https://api.example.com/data', {
        signal: controller.signal,
        timeout: 10000
      }).catch(err => err)

      // Abort before timeout
      controller.abort()
      await vi.advanceTimersByTimeAsync(0)

      const error = await promise

      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain('aborted')
    })
  })

  describe('fetchJSON - JSON parse error handling', () => {
    it('throws error on invalid JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token')
        }
      })

      await expect(
        fetchJSON('https://api.example.com/data')
      ).rejects.toThrow('Failed to parse JSON response')
    })

    it('includes parse error details in error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0')
        }
      })

      await expect(
        fetchJSON('https://api.example.com/data')
      ).rejects.toThrow('Unexpected token < in JSON at position 0')
    })
  })

  describe('fetchJSON - non-retryable errors', () => {
    it('does not retry on 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      })

      await expect(
        fetchJSON('https://api.example.com/data')
      ).rejects.toThrow('HTTP 400: Bad Request')

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('does not retry on 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      await expect(
        fetchJSON('https://api.example.com/data')
      ).rejects.toThrow('HTTP 401: Unauthorized')

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('does not retry on 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      await expect(
        fetchJSON('https://api.example.com/data')
      ).rejects.toThrow('HTTP 404: Not Found')

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('does not retry on 422 Unprocessable Entity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity'
      })

      await expect(
        fetchJSON('https://api.example.com/data')
      ).rejects.toThrow('HTTP 422: Unprocessable Entity')

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('fetchJSON - mixed error scenarios', () => {
    it('handles mix of retryable and successful attempts', async () => {
      const mockData = { success: true }

      mockFetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData
        })

      const promise = fetchJSON('https://api.example.com/data')

      await vi.advanceTimersByTimeAsync(500)  // First retry
      await vi.advanceTimersByTimeAsync(1000) // Second retry

      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result).toEqual(mockData)
    })

    it('exhausts retries with different error types', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })

      const promise = fetchJSON('https://api.example.com/data').catch(err => err)

      await vi.advanceTimersByTimeAsync(500)  // First retry
      await vi.advanceTimersByTimeAsync(1000) // Second retry

      const error = await promise

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(error).toBeInstanceOf(Error)
    })

    it('throws network error after max retries', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

      const promise = fetchJSON('https://api.example.com/data').catch(err => err)

      await vi.advanceTimersByTimeAsync(500)  // First retry
      await vi.advanceTimersByTimeAsync(1000) // Second retry

      const error = await promise

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain('Network error after 3 attempts')
    })
  })

  describe('fetchJSON - console logging', () => {
    it('logs retry attempts with delay information', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const mockData = { success: true }

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData
        })

      const promise = fetchJSON('https://api.example.com/data')
      await vi.advanceTimersByTimeAsync(500)

      await promise

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[HttpClient] HTTP 500 (attempt 1/3), retrying in 500ms...'),
        expect.objectContaining({ status: 500 })
      )

      consoleSpy.mockRestore()
    })

    it('logs network error retries', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const mockData = { success: true }

      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData
        })

      const promise = fetchJSON('https://api.example.com/data')
      await vi.advanceTimersByTimeAsync(500)

      await promise

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[HttpClient] Network error (attempt 1/3), retrying in 500ms...'),
        expect.any(TypeError)
      )

      consoleSpy.mockRestore()
    })
  })
})
