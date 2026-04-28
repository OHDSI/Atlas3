/**
 * Unit Tests: Feature Analysis Service
 *
 * Covers happy-path, network-error, and parse-failure flows for the thin
 * façade in `src/services/feature-analysis.service.ts`. Validation lives
 * in `webapi.ts`; here we mock global `fetch` so the full WebAPI stack is
 * exercised end-to-end through the façade.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger so we can assert error logging
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock auth store (http-client imports it dynamically)
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ token: null })),
}))

import {
  listFeatureAnalyses,
  getFeatureAnalysis,
  createFeatureAnalysis,
  updateFeatureAnalysis,
  deleteFeatureAnalysis,
  copyFeatureAnalysis,
  featureAnalysisNameExists,
  listFeatureAnalysisDomains,
  listFeatureAnalysisAggregates,
  getDefaultCovariateSettings,
} from '@/services/feature-analysis.service'
import { logger } from '@/utils/logger'

function mockFetchOnce(body: unknown, ok = true, status = 200): void {
  const fetchMock = global.fetch as ReturnType<typeof vi.fn>
  fetchMock.mockResolvedValueOnce({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response)
}

describe('FeatureAnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('listFeatureAnalyses', () => {
    it('returns parsed list from a bare array response', async () => {
      mockFetchOnce([
        { id: 1, name: 'FA 1', type: 'PRESET' },
        { id: 2, name: 'FA 2', type: 'CRITERIA_SET' },
      ])

      const result = await listFeatureAnalyses()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/feature-analysis?size=100000'),
        expect.any(Object)
      )
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('FA 1')
    })

    it('handles a Spring `{ content: [...] }` page wrapper', async () => {
      mockFetchOnce({ content: [{ id: 1, name: 'FA 1', type: 'PRESET' }] })

      const result = await listFeatureAnalyses()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
    })

    it('throws and logs on parse failure', async () => {
      mockFetchOnce([{ id: 'not-a-number', name: 'oops' }])

      await expect(listFeatureAnalyses()).rejects.toThrow('Invalid response from /feature-analysis')
      expect(logger.error).toHaveBeenCalled()
    })

    it('throws on network/HTTP error', async () => {
      // 500 will retry up to 3 times; force all attempts to fail
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: () => Promise.resolve(''),
      } as unknown as Response)

      await expect(listFeatureAnalyses()).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('getFeatureAnalysis', () => {
    it('returns a feature analysis on success', async () => {
      mockFetchOnce({
        id: 7,
        name: 'My FA',
        type: 'CUSTOM_FE',
        design: 'SELECT 1',
      })

      const result = await getFeatureAnalysis(7)

      expect(result?.name).toBe('My FA')
      expect(result?.type).toBe('CUSTOM_FE')
    })

    it('throws on parse failure', async () => {
      mockFetchOnce({ name: 'missing fields' })

      await expect(getFeatureAnalysis(7)).rejects.toThrow('Invalid response from /feature-analysis/7')
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('createFeatureAnalysis', () => {
    it('POSTs and returns the created analysis', async () => {
      mockFetchOnce({
        id: 42,
        name: 'New FA',
        type: 'PRESET',
        design: { useDemographicsAge: true },
      })

      const result = await createFeatureAnalysis({
        name: 'New FA',
        type: 'PRESET',
        design: { useDemographicsAge: true },
      })

      expect(result.id).toBe(42)
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [, init] = fetchMock.mock.calls[0]
      expect(init.method).toBe('POST')
    })
  })

  describe('updateFeatureAnalysis', () => {
    it('PUTs to /feature-analysis/{id}', async () => {
      mockFetchOnce({
        id: 9,
        name: 'Updated',
        type: 'PRESET',
        design: {},
      })

      const result = await updateFeatureAnalysis({
        id: 9,
        name: 'Updated',
        type: 'PRESET',
        design: {},
      })

      expect(result.id).toBe(9)
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/feature-analysis/9')
      expect(init.method).toBe('PUT')
    })

    it('throws when id is missing', async () => {
      await expect(
        updateFeatureAnalysis({
          name: 'no id',
          type: 'PRESET',
          design: {},
        })
      ).rejects.toThrow('updateFeatureAnalysis requires fa.id')
    })
  })

  describe('deleteFeatureAnalysis', () => {
    it('DELETEs and resolves', async () => {
      mockFetchOnce(undefined)

      await expect(deleteFeatureAnalysis(3)).resolves.toBeUndefined()

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/feature-analysis/3')
      expect(init.method).toBe('DELETE')
    })
  })

  describe('copyFeatureAnalysis', () => {
    it('GETs /copy and returns the new analysis', async () => {
      mockFetchOnce({
        id: 200,
        name: 'Copy of FA',
        type: 'PRESET',
        design: {},
      })

      const result = await copyFeatureAnalysis(100)

      expect(result.id).toBe(200)
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/feature-analysis/100/copy')
      expect(init.method).toBe('GET')
    })
  })

  describe('featureAnalysisNameExists', () => {
    it('returns true for boolean true', async () => {
      mockFetchOnce(true)
      await expect(featureAnalysisNameExists(0, 'foo')).resolves.toBe(true)
    })

    it('encodes the name parameter', async () => {
      mockFetchOnce(false)
      await featureAnalysisNameExists(0, 'My Name & Friends')

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url] = fetchMock.mock.calls[0]
      expect(url).toContain('name=My%20Name%20%26%20Friends')
    })
  })

  describe('listFeatureAnalysisDomains', () => {
    it('returns string[]', async () => {
      mockFetchOnce(['CONDITION', 'DRUG'])
      const result = await listFeatureAnalysisDomains()
      expect(result).toEqual(['CONDITION', 'DRUG'])
    })
  })

  describe('listFeatureAnalysisAggregates', () => {
    it('returns parsed aggregates', async () => {
      mockFetchOnce([
        { id: 1, name: 'Events count', expression: '*', function: 'COUNT' },
        { id: 2, name: 'Sum', description: 'Sum of values' },
      ])

      const result = await listFeatureAnalysisAggregates()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(1)
    })

    it('logs and rethrows on network/HTTP error', async () => {
      mockFetchOnce(undefined, false, 500)

      await expect(listFeatureAnalysisAggregates()).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('getDefaultCovariateSettings', () => {
    it('GETs with temporal=true', async () => {
      mockFetchOnce({ useDemographicsAge: true })

      await getDefaultCovariateSettings(true)

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url] = fetchMock.mock.calls[0]
      expect(url).toContain('temporal=true')
    })

    it('GETs with temporal=false', async () => {
      mockFetchOnce({})

      await getDefaultCovariateSettings(false)

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url] = fetchMock.mock.calls[0]
      expect(url).toContain('temporal=false')
    })

    it('logs and rethrows on network/HTTP error', async () => {
      mockFetchOnce(undefined, false, 500)

      await expect(getDefaultCovariateSettings(true)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })
  })

  // Catch-block coverage for the remaining façade methods. Each call mocks
  // a 500 (with retries exhausted) and asserts the façade logs + rethrows.
  describe('error logging across façade', () => {
    function force500(): void {
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: () => Promise.resolve(''),
      } as unknown as Response)
    }

    it('getFeatureAnalysis catch path', async () => {
      force500()
      await expect(getFeatureAnalysis(1)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('createFeatureAnalysis catch path', async () => {
      force500()
      await expect(
        createFeatureAnalysis({ name: 'x', type: 'PRESET', design: {} })
      ).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('updateFeatureAnalysis catch path', async () => {
      force500()
      await expect(
        updateFeatureAnalysis({ id: 1, name: 'x', type: 'PRESET', design: {} })
      ).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('deleteFeatureAnalysis catch path', async () => {
      force500()
      await expect(deleteFeatureAnalysis(1)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('copyFeatureAnalysis catch path', async () => {
      force500()
      await expect(copyFeatureAnalysis(1)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('featureAnalysisNameExists catch path', async () => {
      force500()
      await expect(featureAnalysisNameExists(0, 'name')).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('listFeatureAnalysisDomains catch path', async () => {
      force500()
      await expect(listFeatureAnalysisDomains()).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })
  })
})
