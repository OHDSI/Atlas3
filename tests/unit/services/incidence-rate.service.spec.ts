/**
 * Unit Tests: Incidence Rate Service
 *
 * Covers happy-path and failure flows for the /ir/... endpoints, which now
 * live directly in this service and return `ApiResult<T>` instead of
 * throwing (or swallowing into a bare boolean/number). We mock global
 * `fetch` so the full stack (httpClient -> Zod validation -> ApiResult) is
 * exercised end-to-end.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  listIncidenceRates,
  getIncidenceRate,
  createIncidenceRate,
  saveIncidenceRate,
  copyIncidenceRate,
  deleteIncidenceRate,
  existsIncidenceRate,
  assignIncidenceRateTag,
  unassignIncidenceRateTag,
  listIncidenceRateInfo,
  getIncidenceRateInfoBySource,
  generateIncidenceRate,
  cancelIncidenceRateGeneration,
  deleteIncidenceRateInfo,
  getIncidenceRateReport,
  exportIncidenceRate,
  importIncidenceRate,
} from '@/services/incidence-rate.service'
import { logger } from '@/utils/logger'

const expressionObj = {
  ConceptSets: [],
  targetIds: [],
  outcomeIds: [],
  timeAtRisk: {
    start: { DateField: 'StartDate', Offset: 0 },
    end: { DateField: 'EndDate', Offset: 0 },
  },
  strata: [],
}

const irWire = {
  id: 1,
  name: 'X',
  expression: JSON.stringify(expressionObj),
  tags: [],
}

const irInternal = {
  id: 1,
  name: 'X',
  expression: expressionObj,
  tags: [],
}

describe('services/incidence-rate.service', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  function ok(body: unknown) {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(body) })
  }

  it('does not import the webapi barrel', async () => {
    const source = await import('node:fs').then(fs =>
      fs.readFileSync('src/services/incidence-rate.service.ts', 'utf8')
    )
    expect(source).not.toContain("from '@/services/webapi'")
  })

  describe('listIncidenceRates', () => {
    it('calls /ir/ and returns the parsed summary list', async () => {
      ok([{ id: 1, name: 'X', tags: [] }])

      const result = await listIncidenceRates()

      expect(result.success).toBe(true)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/ir/')
    })

    it('returns failure on parse error', async () => {
      ok([{ name: '', id: 'oops' }])

      const result = await listIncidenceRates()

      expect(result.success).toBe(false)
    })
  })

  describe('getIncidenceRate', () => {
    it('hits /ir/{id} and decodes the expression JSON string', async () => {
      ok(irWire)

      const result = await getIncidenceRate(7)

      expect(result.success).toBe(true)
      if (result.success) expect(result.data.expression.timeAtRisk.start.DateField).toBe('StartDate')
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/ir/7')
    })

    it('reports a status-carrying failure instead of throwing', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'no access',
      })

      const result = await getIncidenceRate(7)

      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.status).toBe(403)
    })

    it('synthesizes a default timeAtRisk expression when the wire payload omits it', async () => {
      ok({ id: 1, name: 'X', tags: [] })

      const result = await getIncidenceRate(1)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.expression.timeAtRisk).toEqual({
          start: { DateField: 'StartDate', Offset: 0 },
          end: { DateField: 'StartDate', Offset: 0 },
        })
      }
    })

    it('reports malformed expression JSON as a failure instead of throwing a raw SyntaxError', async () => {
      ok({ id: 1, name: 'X', expression: 'not valid json{', tags: [] })

      const result = await getIncidenceRate(1)

      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.message).toBe('expression is not valid JSON')
    })
  })

  describe('createIncidenceRate', () => {
    it('POSTs to /ir/ with expression as a JSON string', async () => {
      ok(irWire)

      await createIncidenceRate(irInternal as never)

      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/ir/')
      expect(typeof (JSON.parse(init.body as string) as { expression: unknown }).expression).toBe(
        'string'
      )
    })
  })

  describe('saveIncidenceRate', () => {
    it('PUTs to /ir/{id} with expression as a JSON string', async () => {
      ok(irWire)

      await saveIncidenceRate(7, irInternal as never)

      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/ir/7')
      expect(init.method).toBe('PUT')
    })
  })

  describe('copyIncidenceRate', () => {
    it('GETs /ir/{id}/copy and decodes the expression', async () => {
      ok(irWire)

      const result = await copyIncidenceRate(7)

      expect(result.success).toBe(true)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/ir/7/copy')
    })
  })

  describe('deleteIncidenceRate', () => {
    it('DELETEs /ir/{id} and succeeds', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

      const result = await deleteIncidenceRate(7)

      expect(result.success).toBe(true)
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/ir/7')
      expect(init.method).toBe('DELETE')
    })

    it('reports why a delete failed instead of returning false', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        text: async () => 'incidence rate is referenced by a generation',
      })

      const result = await deleteIncidenceRate(7)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.status).toBe(409)
        expect(result.error.body).toBe('incidence rate is referenced by a generation')
      }
    })
  })

  describe('existsIncidenceRate', () => {
    it('encodes the name', async () => {
      ok(0)

      const result = await existsIncidenceRate('hello world', 0)

      expect(result.success).toBe(true)
      if (result.success) expect(result.data).toBe(0)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/ir/0/exists?name=hello%20world')
    })

    it('reports a network failure as ApiResult rather than a false-negative 0', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await existsIncidenceRate('hello world', 0)

      expect(result.success).toBe(false)
    })
  })

  describe('tag assignment', () => {
    it('assign and unassign use the right verbs', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

      const assignResult = await assignIncidenceRateTag(1, 2)
      const unassignResult = await unassignIncidenceRateTag(1, 2)

      expect(assignResult.success).toBe(true)
      expect(unassignResult.success).toBe(true)
      const [, assignInit] = mockFetch.mock.calls[0]
      const [, unassignInit] = mockFetch.mock.calls[1]
      expect(assignInit.method).toBe('POST')
      expect(unassignInit.method).toBe('DELETE')
    })
  })

  describe('listIncidenceRateInfo', () => {
    it('hits /ir/{id}/info', async () => {
      ok([])

      await listIncidenceRateInfo(7)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/ir/7/info')
    })

    it('reports a parse failure carrying the status and Zod issues', async () => {
      ok([{ executionInfo: 'not an object' }])

      const result = await listIncidenceRateInfo(7)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Invalid info list response')
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(issues.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getIncidenceRateInfoBySource', () => {
    it('hits /ir/{id}/info/{src}', async () => {
      ok({
        executionInfo: { id: { analysisId: 1, sourceId: 2 }, status: 'PENDING' },
      })

      await getIncidenceRateInfoBySource(7, 'CCAE')

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/ir/7/info/CCAE')
    })

    it('reports a parse failure carrying the status and Zod issues', async () => {
      ok({ executionInfo: 'not an object' })

      const result = await getIncidenceRateInfoBySource(7, 'CCAE')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Invalid info-by-source response')
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(issues.length).toBeGreaterThan(0)
      }
    })
  })

  describe('generateIncidenceRate', () => {
    it('GETs /ir/{id}/execute/{src}', async () => {
      ok({ id: { analysisId: 1, sourceId: 2 }, status: 'PENDING' })

      const result = await generateIncidenceRate(1, 'CCAE')

      expect(result.success).toBe(true)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/ir/1/execute/CCAE')
    })
  })

  describe('cancelIncidenceRateGeneration', () => {
    it('DELETEs /ir/{id}/execute/{src} and succeeds', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

      const result = await cancelIncidenceRateGeneration(1, 'CCAE')

      expect(result.success).toBe(true)
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/ir/1/execute/CCAE')
      expect(init.method).toBe('DELETE')
    })

    it('reports why a cancel failed', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'generation already finished',
      })

      const result = await cancelIncidenceRateGeneration(1, 'CCAE')

      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.status).toBe(404)
    })
  })

  describe('deleteIncidenceRateInfo', () => {
    it('DELETEs /ir/{id}/info/{src}', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

      const result = await deleteIncidenceRateInfo(1, 'CCAE')

      expect(result.success).toBe(true)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/ir/1/info/CCAE')
    })
  })

  describe('getIncidenceRateReport', () => {
    it('encodes targetId/outcomeId', async () => {
      ok({
        summary: {
          targetId: 1,
          outcomeId: 2,
          totalPersons: 0,
          cases: 0,
          timeAtRisk: 0,
          proportion: 0,
          rate: 0,
        },
        stratifyStats: [],
        treemapData: '{}',
      })

      await getIncidenceRateReport(1, 'CCAE', 10, 20)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/ir/1/report/CCAE?targetId=10&outcomeId=20')
    })

    it('reports a parse failure carrying the status and Zod issues', async () => {
      ok({ summary: 'not an object', stratifyStats: [], treemapData: '{}' })

      const result = await getIncidenceRateReport(1, 'CCAE', 10, 20)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Invalid report response')
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(issues.length).toBeGreaterThan(0)
      }
    })
  })

  describe('exportIncidenceRate', () => {
    it('GETs /ir/{id}/design and returns the raw design', async () => {
      ok({ some: 'design' })

      const result = await exportIncidenceRate(7)

      expect(result).toEqual({ some: 'design' })
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/ir/7/design')
    })

    it('logs and rethrows instead of swallowing a transport failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      await expect(exportIncidenceRate(7)).rejects.toThrow('network error')
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        'IncidenceRate',
        'exportIncidenceRate(7) failed',
        expect.any(Error)
      )
    })
  })

  describe('importIncidenceRate', () => {
    it('POSTs /ir/design and decodes the returned expression', async () => {
      ok(irWire)

      const result = await importIncidenceRate({ design: irWire })

      expect(result.expression.timeAtRisk.start.DateField).toBe('StartDate')
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/ir/design')
      expect(init.method).toBe('POST')
    })

    it('rejects with malformed-JSON error rather than a raw SyntaxError', async () => {
      ok({ id: 1, name: 'X', expression: 'not valid json{', tags: [] })

      await expect(importIncidenceRate({ design: {} })).rejects.toThrow(
        'expression is not valid JSON'
      )
    })
  })
})
