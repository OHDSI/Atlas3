import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ token: 'mock-token' })),
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
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
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
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.status).toBe(404)
      }
    })

    it('returns the definition on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 1, name: 'C', expression: JSON.stringify({ ConceptSets: [] }) }),
      })

      const result = await getCohortDefinition(1)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('C')
        expect(result.data.expression).toMatchObject({ ConceptSets: [] })
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('parses a stringified expression into a circe object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            id: 1,
            name: 'Demo',
            expression: JSON.stringify({ ConceptSets: [], PrimaryCriteria: { CriteriaList: [] } }),
          }),
      })

      const result = await getCohortDefinition(1)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.expression).toEqual({
          ConceptSets: [],
          PrimaryCriteria: { CriteriaList: [] },
        })
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('reports a malformed expression as a failed ApiResult instead of an empty cohort', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 1, name: 'Demo', expression: '{ not json' }),
      })

      const result = await getCohortDefinition(1)

      expect(result).toMatchObject({ success: false, error: { status: 422 } })
    })

    it('reports an expression that fails circe validation as a 422', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({ id: 1, name: 'Demo', expression: JSON.stringify({ ConceptSets: 7 }) }),
      })

      const result = await getCohortDefinition(1)

      expect(result).toMatchObject({ success: false, error: { status: 422 } })
    })

    it('reports a definition that carries no expression as a 422', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 1, name: 'Demo' }),
      })

      const result = await getCohortDefinition(1)

      expect(result).toMatchObject({ success: false, error: { status: 422 } })
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
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('network error')
      }
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
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('reports failure as ApiResult rather than null', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await generateCohort(123, 'SYNPUF1K')

      expect(result.success).toBe(false)
    })

    // generateCohort triggers the same job getCohortGenerationInfo polls
    // moments later, so both must agree on every raw status via the shared
    // toGenerationStatus helper — a table pinned only against one entry
    // point would miss the other silently drifting.
    it.each([
      ['PENDING', 'PENDING'],
      ['STARTING', 'PENDING'],
      ['STARTED', 'RUNNING'],
      ['RUNNING', 'RUNNING'],
      ['STOPPING', 'RUNNING'],
      ['COMPLETE', 'COMPLETE'],
      ['COMPLETED', 'COMPLETE'],
      ['FAILED', 'FAILED'],
      ['STOPPED', 'FAILED'],
      ['ABANDONED', 'FAILED'],
    ])('maps job status %s to GenerationStatus %s', async (jobStatus, expected) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: jobStatus, executionId: 1 }),
      })

      const result = await generateCohort(123, 'SYNPUF1K')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe(expected)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('defaults an unrecognized job status to PENDING rather than throwing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: 'SOME_NEW_SPRING_STATUS', executionId: 1 }),
      })

      const result = await generateCohort(123, 'SYNPUF1K')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('PENDING')
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('maps executionId to the job id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: 'RUNNING', executionId: 789 }),
      })

      const result = await generateCohort(123, 'SYNPUF1K')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(789)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('falls back to a generated id when executionId is absent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: 'RUNNING' }),
      })

      const result = await generateCohort(123, 'SYNPUF1K')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(typeof result.data.id).toBe('number')
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('converts startDate/endDate to ISO startTime/endTime', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            status: 'COMPLETED',
            executionId: 1,
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-01-02T00:00:00.000Z',
          }),
      })

      const result = await generateCohort(123, 'SYNPUF1K')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.startTime).toBe(new Date('2026-01-01T00:00:00.000Z').toISOString())
        expect(result.data.endTime).toBe(new Date('2026-01-02T00:00:00.000Z').toISOString())
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('leaves startTime/endTime undefined when the dates are absent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: 'RUNNING', executionId: 1 }),
      })

      const result = await generateCohort(123, 'SYNPUF1K')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.startTime).toBeUndefined()
        expect(result.data.endTime).toBeUndefined()
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
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
      if (result.success) {
        expect(result.data).toHaveLength(1)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('throws an ApiError on an invalid response shape rather than silently failing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ not: 'an array' }),
      })

      const result = await getCohortGenerationInfo(123)

      expect(result.success).toBe(false)
    })

    // The raw Spring Batch job status on the wire does not match the
    // internal four-value GenerationStatus enum; the schema's
    // `generationStatusFromRaw` transform normalizes it. Polling silently
    // dies if this table drifts, so pin every raw -> internal pair.
    it.each([
      ['PENDING', 'PENDING'],
      ['STARTING', 'PENDING'],
      ['STARTED', 'RUNNING'],
      ['RUNNING', 'RUNNING'],
      ['STOPPING', 'RUNNING'],
      ['COMPLETE', 'COMPLETE'],
      ['COMPLETED', 'COMPLETE'],
      ['FAILED', 'FAILED'],
      ['STOPPED', 'FAILED'],
      ['ABANDONED', 'FAILED'],
    ])('normalizes raw status %s to GenerationStatus %s', async (rawStatus, expected) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify([{ id: { cohortDefinitionId: 123, sourceId: 1 }, status: rawStatus }]),
      })

      const result = await getCohortGenerationInfo(123)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data[0].status).toBe(expected)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('normalizes an unrecognized raw status to PENDING rather than failing validation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify([
            { id: { cohortDefinitionId: 123, sourceId: 1 }, status: 'SOME_NEW_SPRING_STATUS' },
          ]),
      })

      const result = await getCohortGenerationInfo(123)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data[0].status).toBe('PENDING')
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
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
      if (result.success) {
        expect(result.data).toHaveLength(1)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('reports a malformed cohort in the list as ApiResult failure carrying the Zod issues', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify([{ id: -1, name: 'Bad id' }]),
      })

      const result = await getCohorts()

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('Invalid cohort list response format')
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(issues.length).toBeGreaterThan(0)
      }
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
      if (result.success) {
        expect(result.data.warnings).toHaveLength(1)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('reports a network failure as ApiResult instead of masking it as a synthetic warning', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await validateCohortDefinition('Test', {})

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('Network error')
      }
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
      if (result.success) {
        expect(result.data).toContain('Report')
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
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
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.status).toBe(500)
      }
    })

    it('sends the expression it is given as the request body', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '<html></html>' })

      await getCohortPrintFriendly({ ConceptSets: [] } as never)

      const [, options] = mockFetch.mock.calls[0]
      expect(JSON.parse(options.body as string)).toEqual({ ConceptSets: [] })
    })

    it('attaches an Authorization header when an auth token is available', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '<html></html>' })

      await getCohortPrintFriendly({ expression: {} } as never)

      const [, options] = mockFetch.mock.calls[0]
      expect((options.headers as Record<string, string>).Authorization).toBe('Bearer mock-token')
    })

    it('reports a text-parse failure as ApiResult instead of throwing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => {
          throw new Error('stream error')
        },
      })

      const result = await getCohortPrintFriendly({ expression: {} } as never)

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('Invalid response format')
        expect(result.error.status).toBe(0)
      }
    })
  })
})
