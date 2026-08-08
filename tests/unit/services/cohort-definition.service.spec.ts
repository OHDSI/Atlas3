import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  getCohortDefinition,
  saveCohortDefinition,
  deleteCohortDefinition,
  deleteCohort,
  assignTagToCohort,
  unassignTagFromCohort,
  generateCohort,
  getCohortGenerationInfo,
  getCohorts,
  validateCohortDefinition,
  getCohortPrintFriendly,
} from '@/services/cohort-definition.service'

describe('services/cohort-definition.service', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  describe('getCohortDefinition', () => {
    it('distinguishes a 403 from a missing cohort', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'no read access',
      })

      const result = await getCohortDefinition(1)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.status).toBe(403)
        expect(result.error.body).toBe('no read access')
      }
    })

    it('reports a 404 as a 404, not as an indistinguishable null', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => '',
      })

      const result = await getCohortDefinition(1)

      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.status).toBe(404)
    })

    it('returns the definition on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 1, name: 'C', expression: { ConceptSets: [] } }),
      })

      const result = await getCohortDefinition(1)

      expect(result.success).toBe(true)
      if (result.success) expect(result.data.name).toBe('C')
    })
  })

  describe('saveCohortDefinition', () => {
    it('does not re-send a failed save', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: async () => '',
      })

      const result = await saveCohortDefinition({ name: 'C', expression: {} })

      expect(result.success).toBe(false)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('POSTs when creating (no id)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 1, name: 'C', expression: {} }),
      })

      const result = await saveCohortDefinition({ name: 'C', expression: {} })

      expect(result.success).toBe(true)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohortdefinition')
      expect(options.method).toBe('POST')
    })

    it('PUTs when updating (has id)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 5, name: 'C', expression: {} }),
      })

      await saveCohortDefinition({ id: 5, name: 'C', expression: {} })

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohortdefinition/5')
      expect(options.method).toBe('PUT')
    })
  })

  describe('deleteCohortDefinition / deleteCohort', () => {
    it('deleteCohortDefinition reports failure as ApiResult, not a thrown error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await deleteCohortDefinition(123)

      expect(result.success).toBe(false)
    })

    it('deleteCohort DELETEs the definition', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

      const result = await deleteCohort(123)

      expect(result.success).toBe(true)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohortdefinition/123')
      expect(options.method).toBe('DELETE')
    })
  })

  describe('assignTagToCohort / unassignTagFromCohort', () => {
    it('assignTagToCohort POSTs the raw tagId and reports success', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

      const result = await assignTagToCohort(1, 10)

      expect(result.success).toBe(true)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohortdefinition/1/tag/')
      expect(options.method).toBe('POST')
      expect(options.body).toBe('10')
    })

    it('assignTagToCohort carries the failure as an ApiError, not a bare string', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await assignTagToCohort(1, 10)

      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.message).toBe('network error')
    })

    it('unassignTagFromCohort DELETEs the tag and reports success', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

      const result = await unassignTagFromCohort(1, 10)

      expect(result.success).toBe(true)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohortdefinition/1/tag/10')
      expect(options.method).toBe('DELETE')
    })

    it('unassignTagFromCohort reports failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await unassignTagFromCohort(1, 10)

      expect(result.success).toBe(false)
    })
  })

  describe('generateCohort', () => {
    it('generates cohort for source and maps status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: 'STARTING', executionId: 456 }),
      })

      const result = await generateCohort(123, 'SYNPUF1K')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.cohortDefinitionId).toBe(123)
        expect(result.data.sourceKey).toBe('SYNPUF1K')
        expect(result.data.status).toBe('PENDING')
      }
    })

    it('reports failure as ApiResult rather than null', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await generateCohort(123, 'SYNPUF1K')

      expect(result.success).toBe(false)
    })
  })

  describe('getCohortGenerationInfo', () => {
    it('fetches generation info', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify([{ id: { cohortDefinitionId: 123, sourceId: 1 }, status: 'COMPLETE' }]),
      })

      const result = await getCohortGenerationInfo(123)

      expect(result.success).toBe(true)
      if (result.success) expect(result.data).toHaveLength(1)
    })

    it('throws an ApiError on an invalid response shape rather than silently failing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ not: 'an array' }),
      })

      const result = await getCohortGenerationInfo(123)

      expect(result.success).toBe(false)
    })
  })

  describe('getCohorts', () => {
    it('fetches all cohorts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify([{ id: 1, name: 'Cohort 1' }]),
      })

      const result = await getCohorts()

      expect(result.success).toBe(true)
      if (result.success) expect(result.data).toHaveLength(1)
    })
  })

  describe('validateCohortDefinition', () => {
    it('validates cohort and returns warnings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ warnings: [{ message: 'Test warning' }] }),
      })

      const result = await validateCohortDefinition('Test', {})

      expect(result.success).toBe(true)
      if (result.success) expect(result.data.warnings).toHaveLength(1)
    })

    it('reports a network failure as ApiResult instead of masking it as a synthetic warning', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await validateCohortDefinition('Test', {})

      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.message).toBe('Network error')
    })
  })

  describe('getCohortPrintFriendly', () => {
    it('fetches print friendly HTML', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<html>Report</html>',
      })

      const result = await getCohortPrintFriendly({ expression: {} } as never)

      expect(result.success).toBe(true)
      if (result.success) expect(result.data).toContain('Report')
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohortdefinition/printfriendly/cohort')
      expect(options.method).toBe('POST')
    })

    it('carries the HTTP status through on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      })

      const result = await getCohortPrintFriendly({} as never)

      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.status).toBe(500)
    })
  })
})
