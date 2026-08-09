/**
 * Unit Tests: Feature Analysis Service
 *
 * Covers happy-path and failure flows for the feature-analysis endpoints,
 * which now live directly in this service and return `ApiResult<T>`
 * instead of throwing. We mock global `fetch` so the full stack
 * (httpClient -> Zod validation -> ApiResult) is exercised end-to-end.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
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

describe('services/feature-analysis.service', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  function ok(body: unknown) {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(body) })
  }

  describe('listFeatureAnalyses', () => {
    it('returns parsed list from a bare array response', async () => {
      ok([
        { id: 1, name: 'FA 1', type: 'PRESET' },
        { id: 2, name: 'FA 2', type: 'CRITERIA_SET' },
      ])

      const result = await listFeatureAnalyses()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0].name).toBe('FA 1')
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/feature-analysis?size=100000')
    })

    it('handles a Spring `{ content: [...] }` page wrapper', async () => {
      ok({ content: [{ id: 1, name: 'FA 1', type: 'PRESET' }] })

      const result = await listFeatureAnalyses()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('reports a parse failure as ApiResult rather than throwing', async () => {
      ok([{ id: 'not-a-number', name: 'oops' }])

      const result = await listFeatureAnalyses()

      expect(result.success).toBe(false)
    })

    it('reports a network failure as ApiResult', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await listFeatureAnalyses()

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('network error')
      }
    })
  })

  describe('getFeatureAnalysis', () => {
    it('returns a failure carrying the status instead of throwing', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'no access',
      })

      const { listFeatureAnalyses } = await import('@/services/feature-analysis.service')
      const result = await listFeatureAnalyses()

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.status).toBe(403)
      }
    })

    it('does not import the webapi barrel', async () => {
      const source = await import('node:fs').then(fs =>
        fs.readFileSync('src/services/feature-analysis.service.ts', 'utf8')
      )
      expect(source).not.toContain("from '@/services/webapi'")
    })

    it('returns a feature analysis on success', async () => {
      ok({ id: 7, name: 'My FA', type: 'CUSTOM_FE', design: 'SELECT 1' })

      const result = await getFeatureAnalysis(7)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('My FA')
        expect(result.data.type).toBe('CUSTOM_FE')
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('reports a parse failure as ApiResult', async () => {
      ok({ name: 'missing fields' })

      const result = await getFeatureAnalysis(7)

      expect(result.success).toBe(false)
    })
  })

  describe('createFeatureAnalysis', () => {
    it('POSTs and returns the created analysis', async () => {
      ok({ id: 42, name: 'New FA', type: 'PRESET', design: { useDemographicsAge: true } })

      const result = await createFeatureAnalysis({
        name: 'New FA',
        type: 'PRESET',
        design: { useDemographicsAge: true },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(42)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      const [, init] = mockFetch.mock.calls[0]
      expect(init.method).toBe('POST')
    })

    it('reports a network failure as ApiResult', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await createFeatureAnalysis({ name: 'x', type: 'PRESET', design: {} })

      expect(result.success).toBe(false)
    })

    it('reports a parse failure carrying the status and Zod issues, not just a boolean', async () => {
      ok({ id: 1, type: 'BOGUS_TYPE', design: {} })

      const result = await createFeatureAnalysis({ name: 'x', type: 'PRESET', design: {} })

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('Invalid response from POST /feature-analysis')
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(Array.isArray(issues)).toBe(true)
        expect(issues.length).toBeGreaterThan(0)
        expect(issues.some((i: { path: string[] }) => i.path.includes('type'))).toBe(true)
      }
    })
  })

  describe('updateFeatureAnalysis', () => {
    it('PUTs to /feature-analysis/{id}', async () => {
      ok({ id: 9, name: 'Updated', type: 'PRESET', design: {} })

      const result = await updateFeatureAnalysis({ id: 9, name: 'Updated', type: 'PRESET', design: {} })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(9)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/feature-analysis/9')
      expect(init.method).toBe('PUT')
    })

    it('reports a failure without a request when id is missing', async () => {
      const result = await updateFeatureAnalysis({ name: 'no id', type: 'PRESET', design: {} })

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('updateFeatureAnalysis requires fa.id')
      }
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('reports a parse failure carrying the status and Zod issues', async () => {
      ok({ id: 9, type: 'BOGUS_TYPE', design: {} })

      const result = await updateFeatureAnalysis({ id: 9, name: 'Updated', type: 'PRESET', design: {} })

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('Invalid response from PUT /feature-analysis/9')
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(issues.some((i: { path: string[] }) => i.path.includes('type'))).toBe(true)
      }
    })
  })

  describe('deleteFeatureAnalysis', () => {
    it('DELETEs and resolves success', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

      const result = await deleteFeatureAnalysis(3)

      expect(result.success).toBe(true)
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/feature-analysis/3')
      expect(init.method).toBe('DELETE')
    })

    it('reports a network failure as ApiResult', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await deleteFeatureAnalysis(3)

      expect(result.success).toBe(false)
    })
  })

  describe('copyFeatureAnalysis', () => {
    it('GETs /copy and returns the new analysis', async () => {
      ok({ id: 200, name: 'Copy of FA', type: 'PRESET', design: {} })

      const result = await copyFeatureAnalysis(100)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(200)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/feature-analysis/100/copy')
      expect(init.method).toBe('GET')
    })

    it('reports a parse failure carrying the status and Zod issues', async () => {
      ok({ type: 'BOGUS_TYPE', design: {} })

      const result = await copyFeatureAnalysis(100)

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('Invalid response from /feature-analysis/100/copy')
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(issues.some((i: { path: string[] }) => i.path.includes('type'))).toBe(true)
      }
    })
  })

  describe('featureAnalysisNameExists', () => {
    it('returns true for boolean true', async () => {
      ok(true)
      const result = await featureAnalysisNameExists(0, 'foo')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(true)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('treats a positive number as an existing name (legacy WebAPI id-count reply)', async () => {
      ok(1)
      const result = await featureAnalysisNameExists(0, 'foo')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(true)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('treats zero as a non-existing name', async () => {
      ok(0)
      const result = await featureAnalysisNameExists(0, 'foo')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(false)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('falls back to Boolean() coercion for an unexpected response shape', async () => {
      ok(null)
      const result = await featureAnalysisNameExists(0, 'foo')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(false)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('encodes the name parameter', async () => {
      ok(false)
      await featureAnalysisNameExists(0, 'My Name & Friends')

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('name=My%20Name%20%26%20Friends')
    })
  })

  describe('listFeatureAnalysisDomains', () => {
    it('returns string[]', async () => {
      ok(['CONDITION', 'DRUG'])
      const result = await listFeatureAnalysisDomains()
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(['CONDITION', 'DRUG'])
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('reports a parse failure carrying the status and Zod issues', async () => {
      ok([42])

      const result = await listFeatureAnalysisDomains()

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('Invalid response from /feature-analysis/domains')
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(issues.length).toBeGreaterThan(0)
      }
    })
  })

  describe('listFeatureAnalysisAggregates', () => {
    it('returns parsed aggregates', async () => {
      ok([
        { id: 1, name: 'Events count', expression: '*', function: 'COUNT' },
        { id: 2, name: 'Sum', description: 'Sum of values' },
      ])

      const result = await listFeatureAnalysisAggregates()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0].id).toBe(1)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('reports a network failure as ApiResult', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await listFeatureAnalysisAggregates()

      expect(result.success).toBe(false)
    })

    it('reports a parse failure carrying the status and Zod issues', async () => {
      ok([{ name: 'missing id' }])

      const result = await listFeatureAnalysisAggregates()

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('Invalid response from /feature-analysis/aggregates')
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(issues.some((i: { path: string[] }) => i.path.includes('id'))).toBe(true)
      }
    })
  })

  describe('getDefaultCovariateSettings', () => {
    it('GETs with temporal=true', async () => {
      ok({ useDemographicsAge: true })

      await getDefaultCovariateSettings(true)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('temporal=true')
    })

    it('GETs with temporal=false', async () => {
      ok({})

      await getDefaultCovariateSettings(false)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('temporal=false')
    })

    it('reports a network failure as ApiResult', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await getDefaultCovariateSettings(true)

      expect(result.success).toBe(false)
    })

    it('reports a parse failure carrying the status and Zod issues', async () => {
      ok('not an object')

      const result = await getDefaultCovariateSettings(true)

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe(
          'Invalid response from /featureextraction/defaultcovariatesettings'
        )
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(issues.length).toBeGreaterThan(0)
      }
    })
  })
})
