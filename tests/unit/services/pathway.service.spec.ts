/**
 * Unit Tests: Pathway Service
 *
 * Covers happy-path and failure flows for the pathway-analysis endpoints,
 * which now live directly in this service and return `ApiResult<T>`
 * instead of throwing (or swallowing into a bare boolean). We mock global
 * `fetch` so the full stack (httpClient -> Zod validation -> ApiResult) is
 * exercised end-to-end.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  listPathways,
  getPathway,
  createPathway,
  savePathway,
  deletePathway,
  copyPathway,
  existsPathway,
  assignPathwayTag,
  unassignPathwayTag,
  runPathwayDiagnostics,
  listPathwayExecutions,
  getPathwayExecution,
  getPathwayResults,
  generatePathway,
  cancelPathwayGeneration,
  getPathwayDesignByGeneration,
} from '@/services/pathway.service'

const samplePathway = {
  id: 1,
  name: 'Test',
  targetCohorts: [],
  eventCohorts: [],
  combinationWindow: 30,
  minCellCount: 5,
  maxDepth: 5,
  allowRepeats: false,
  tags: [],
}

describe('services/pathway.service', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  function ok(body: unknown) {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(body) })
  }

  describe('listPathways', () => {
    it('unwraps a Spring Page envelope', async () => {
      ok({ content: [samplePathway], pageable: {}, totalElements: 1 })

      const result = await listPathways()

      expect(result.success).toBe(true)
      if (result.success) expect(result.data).toHaveLength(1)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/pathway-analysis?size=10000')
    })

    it('also accepts a raw array (legacy/proxy)', async () => {
      ok([samplePathway])

      const result = await listPathways()

      expect(result.success).toBe(true)
    })

    it('reports a network failure as ApiResult', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await listPathways()

      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.message).toBe('network error')
    })

    it('does not import the webapi barrel', async () => {
      const source = await import('node:fs').then(fs =>
        fs.readFileSync('src/services/pathway.service.ts', 'utf8')
      )
      expect(source).not.toContain("from '@/services/webapi'")
    })
  })

  describe('getPathway', () => {
    it('GETs /pathway-analysis/:id', async () => {
      ok(samplePathway)

      const result = await getPathway(1)

      expect(result.success).toBe(true)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/pathway-analysis/1')
    })
  })

  describe('createPathway', () => {
    it('POSTs to /pathway-analysis', async () => {
      ok(samplePathway)

      await createPathway(samplePathway as never)

      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/pathway-analysis')
      expect(init.method).toBe('POST')
    })
  })

  describe('savePathway', () => {
    it('PUTs to /pathway-analysis/:id', async () => {
      ok(samplePathway)

      await savePathway(1, samplePathway as never)

      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/pathway-analysis/1')
      expect(init.method).toBe('PUT')
    })
  })

  describe('copyPathway', () => {
    it('POSTs to /pathway-analysis/:id', async () => {
      ok({ ...samplePathway, id: 2 })

      await copyPathway(1)

      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/pathway-analysis/1')
      expect(init.method).toBe('POST')
    })
  })

  describe('deletePathway', () => {
    it('DELETEs /pathway-analysis/:id and succeeds', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

      const result = await deletePathway(1)

      expect(result.success).toBe(true)
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/pathway-analysis/1')
      expect(init.method).toBe('DELETE')
    })

    it('reports why a delete failed instead of returning false', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        text: async () => 'pathway is referenced by a generation',
      })

      const result = await deletePathway(1)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.status).toBe(409)
        expect(result.error.body).toBe('pathway is referenced by a generation')
      }
    })
  })

  describe('existsPathway', () => {
    it('encodes name and uses 0 when id absent', async () => {
      ok(0)

      const result = await existsPathway('My Pathway')

      expect(result.success).toBe(true)
      if (result.success) expect(result.data).toBe(0)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/pathway-analysis/0/exists?name=My%20Pathway')
    })

    it('reports a network failure as ApiResult rather than a false-negative 0', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await existsPathway('My Pathway')

      expect(result.success).toBe(false)
    })
  })

  describe('pathway tags + diagnostics', () => {
    it('assignPathwayTag POSTs /pathway-analysis/:id/tag/:tagId', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

      const result = await assignPathwayTag(1, 7)

      expect(result.success).toBe(true)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/pathway-analysis/1/tag/7')
    })

    it('assignPathwayTag surfaces a constraint failure instead of a bare false', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'tag already assigned',
      })

      const result = await assignPathwayTag(1, 7)

      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.status).toBe(400)
    })

    it('unassignPathwayTag DELETEs /pathway-analysis/:id/tag/:tagId', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

      const result = await unassignPathwayTag(1, 7)

      expect(result.success).toBe(true)
      const [, init] = mockFetch.mock.calls[0]
      expect(init.method).toBe('DELETE')
    })

    it('runPathwayDiagnostics POSTs /pathway-analysis/check', async () => {
      ok([])

      await runPathwayDiagnostics({ design: {} } as never)

      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/pathway-analysis/check')
      expect(init.method).toBe('POST')
    })
  })

  describe('pathway executions', () => {
    it('listPathwayExecutions GETs /pathway-analysis/:id/generation', async () => {
      ok([])

      await listPathwayExecutions(1)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/pathway-analysis/1/generation')
    })

    it('getPathwayExecution GETs /pathway-analysis/generation/:gid', async () => {
      ok({ id: 99, status: 'COMPLETED', sourceKey: 'cdm' })

      const result = await getPathwayExecution(99)

      expect(result.success).toBe(true)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/pathway-analysis/generation/99')
    })

    it('getPathwayResults GETs /pathway-analysis/generation/:gid/result', async () => {
      ok({ pathwayGroups: [], eventCodes: [] })

      const result = await getPathwayResults(99)

      expect(result.success).toBe(true)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/pathway-analysis/generation/99/result')
    })

    it('generatePathway POSTs /pathway-analysis/:id/generation/:source', async () => {
      ok({ id: 99, status: 'STARTING', sourceKey: 'cdm' })

      await generatePathway(1, 'cdm')

      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/pathway-analysis/1/generation/cdm')
      expect(init.method).toBe('POST')
    })

    it('cancelPathwayGeneration DELETEs the same path and succeeds', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

      const result = await cancelPathwayGeneration(1, 'cdm')

      expect(result.success).toBe(true)
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/pathway-analysis/1/generation/cdm')
      expect(init.method).toBe('DELETE')
    })

    it('cancelPathwayGeneration reports why a cancel failed', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'generation already finished',
      })

      const result = await cancelPathwayGeneration(1, 'cdm')

      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.status).toBe(404)
    })

    it('getPathwayDesignByGeneration GETs /generation/:gid/design', async () => {
      ok({
        name: 'X',
        design: {
          targetCohorts: [],
          eventCohorts: [],
          combinationWindow: 30,
          minCellCount: 5,
          maxDepth: 5,
          allowRepeats: false,
        },
      })

      await getPathwayDesignByGeneration(99)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/pathway-analysis/generation/99/design')
    })
  })
})
