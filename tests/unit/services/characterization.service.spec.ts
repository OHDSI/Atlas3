/**
 * Unit Tests: Characterization Service
 *
 * Covers happy-path and failure flows for the characterization endpoints,
 * which now live directly in this service and return `ApiResult<T>`
 * instead of throwing. We mock global `fetch` so the full stack
 * (httpClient -> Zod validation -> ApiResult) is exercised end-to-end.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  listCharacterizations,
  getCharacterization,
  createCharacterization,
  updateCharacterization,
  deleteCharacterization,
  copyCharacterization,
  characterizationNameExists,
  exportCharacterization,
  importCharacterization,
  listCharacterizationExecutions,
  getCharacterizationExecution,
  generateCharacterization,
  cancelCharacterizationGeneration,
  getCharacterizationDesignSnapshot,
  getCharacterizationResultCount,
  getCharacterizationResults,
  explorePrevalence,
} from '@/services/characterization.service'
import type { CharacterizationDefinition } from '@/models/characterization.types'
import { logger } from '@/utils/logger'

const validDesign: CharacterizationDefinition = {
  id: 1,
  name: 'My Characterization',
  cohorts: [{ id: 100, name: 'Cohort A' }],
  featureAnalyses: [{ id: 7 }],
  stratas: [],
}

describe('services/characterization.service', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  function ok(body: unknown) {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(body) })
  }

  describe('listCharacterizations', () => {
    it('returns parsed list from a bare array', async () => {
      ok([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])

      const result = await listCharacterizations()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohort-characterization?size=10000')
    })

    it('handles a `{ content: [...] }` page wrapper', async () => {
      ok({ content: [{ id: 5, name: 'C' }] })

      const result = await listCharacterizations()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data[0].id).toBe(5)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('reports a parse failure as ApiResult rather than throwing', async () => {
      ok([{ id: 'not-a-number', name: 'oops' }])

      const result = await listCharacterizations()

      expect(result.success).toBe(false)
    })

    it('reports a network failure as ApiResult', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await listCharacterizations()

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('network error')
      }
    })
  })

  describe('getCharacterization', () => {
    it('returns a failure carrying the status instead of throwing', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'no access',
      })

      const { getCharacterization } = await import('@/services/characterization.service')
      const result = await getCharacterization(1)

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.status).toBe(403)
      }
    })

    it('does not import the webapi barrel', async () => {
      const source = await import('node:fs').then(fs =>
        fs.readFileSync('src/services/characterization.service.ts', 'utf8')
      )
      expect(source).not.toContain("from '@/services/webapi'")
    })

    it('GETs /design and returns parsed design', async () => {
      ok(validDesign)

      const result = await getCharacterization(1)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('My Characterization')
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohort-characterization/1/design')
    })

    it('reports a parse failure as ApiResult', async () => {
      ok({ name: 'missing required fields' })

      const result = await getCharacterization(1)

      expect(result.success).toBe(false)
    })
  })

  describe('createCharacterization', () => {
    it('POSTs to /cohort-characterization', async () => {
      ok(validDesign)

      const result = await createCharacterization(validDesign)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(1)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohort-characterization')
      expect(init.method).toBe('POST')
    })

    it('reports a parse failure carrying the status and Zod issues', async () => {
      ok({ ...validDesign, cohorts: 'not an array' })

      const result = await createCharacterization(validDesign)

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('Invalid response from POST /cohort-characterization')
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(issues.some((i: { path: string[] }) => i.path.includes('cohorts'))).toBe(true)
      }
    })

    it('coerces a numeric-and-positive strata id and strips a non-numeric placeholder id', async () => {
      ok(validDesign)

      await createCharacterization({
        ...validDesign,
        stratas: [
          { id: '42', name: 'Real strata', criteria: {} },
          { id: 'placeholder-uuid', name: 'New strata', criteria: {} },
        ],
      })

      const [, init] = mockFetch.mock.calls[0]
      const sent = JSON.parse(init.body as string) as { stratas: Array<Record<string, unknown>> }
      expect(sent.stratas[0].id).toBe(42)
      expect(sent.stratas[1]).not.toHaveProperty('id')
      expect(sent.stratas[1].name).toBe('New strata')
    })
  })

  describe('updateCharacterization', () => {
    it('PUTs to /cohort-characterization/{id}', async () => {
      ok(validDesign)

      const result = await updateCharacterization(validDesign)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(1)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohort-characterization/1')
      expect(init.method).toBe('PUT')
    })

    it('reports a failure without a request when id is missing', async () => {
      const result = await updateCharacterization({ ...validDesign, id: undefined })

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('updateCharacterization requires def.id')
      }
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('reports a parse failure carrying the status and Zod issues', async () => {
      ok({ ...validDesign, cohorts: 'not an array' })

      const result = await updateCharacterization(validDesign)

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('Invalid response from PUT /cohort-characterization/1')
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(issues.some((i: { path: string[] }) => i.path.includes('cohorts'))).toBe(true)
      }
    })
  })

  describe('deleteCharacterization', () => {
    it('DELETEs to /cohort-characterization/{id}', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

      const result = await deleteCharacterization(42)

      expect(result.success).toBe(true)
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohort-characterization/42')
      expect(init.method).toBe('DELETE')
    })

    it('reports a network failure as ApiResult', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const result = await deleteCharacterization(42)

      expect(result.success).toBe(false)
    })
  })

  describe('copyCharacterization', () => {
    it('POSTs to /{id} (no body) and returns the new design', async () => {
      ok({ ...validDesign, id: 99 })

      const result = await copyCharacterization(1)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(99)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohort-characterization/1')
      expect(init.method).toBe('POST')
    })

    it('reports a parse failure carrying the status and Zod issues', async () => {
      ok({ ...validDesign, cohorts: 'not an array' })

      const result = await copyCharacterization(1)

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('Invalid response from POST /cohort-characterization/1')
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(issues.some((i: { path: string[] }) => i.path.includes('cohorts'))).toBe(true)
      }
    })
  })

  describe('characterizationNameExists', () => {
    it('returns boolean from response', async () => {
      ok(true)
      const result = await characterizationNameExists(0, 'name')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(true)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('treats a positive number as an existing name (legacy WebAPI id-count reply)', async () => {
      ok(1)
      const result = await characterizationNameExists(0, 'name')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(true)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('falls back to Boolean() coercion for an unexpected response shape', async () => {
      ok(null)
      const result = await characterizationNameExists(0, 'name')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(false)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('encodes the name parameter', async () => {
      ok(false)
      await characterizationNameExists(0, 'a b')

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('name=a%20b')
    })
  })

  describe('exportCharacterization', () => {
    it('returns the raw response', async () => {
      ok({ some: 'design' })
      const result = await exportCharacterization(1)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ some: 'design' })
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })
  })

  describe('importCharacterization', () => {
    it('POSTs to /import', async () => {
      ok(validDesign)

      const result = await importCharacterization({ raw: 'design' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(1)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohort-characterization/import')
      expect(init.method).toBe('POST')
    })

    it('reports a parse failure carrying the status and Zod issues', async () => {
      ok({ ...validDesign, cohorts: 'not an array' })

      const result = await importCharacterization({ raw: 'design' })

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe('Invalid response from POST /cohort-characterization/import')
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(issues.some((i: { path: string[] }) => i.path.includes('cohorts'))).toBe(true)
      }
    })
  })

  describe('listCharacterizationExecutions', () => {
    it('returns parsed executions', async () => {
      ok([
        { id: 1, status: 'COMPLETED', sourceKey: 'CDM_A' },
        { id: 2, status: 'RUNNING', sourceKey: 'CDM_B' },
      ])

      const result = await listCharacterizationExecutions(1)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0].status).toBe('COMPLETED')
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('reports a parse failure as ApiResult', async () => {
      ok([{ id: 1, status: 'BOGUS_STATUS', sourceKey: 'CDM_A' }])

      const result = await listCharacterizationExecutions(1)

      expect(result.success).toBe(false)
    })
  })

  describe('getCharacterizationExecution', () => {
    it('returns parsed execution', async () => {
      ok({ id: 1, status: 'COMPLETED', sourceKey: 'CDM_A' })

      const result = await getCharacterizationExecution(1)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(1)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('reports a parse failure carrying the status and Zod issues', async () => {
      ok({ id: 1, status: 'BOGUS_STATUS', sourceKey: 'CDM_A' })

      const result = await getCharacterizationExecution(1)

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe(
          'Invalid response from /cohort-characterization/generation/1'
        )
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(issues.some((i: { path: string[] }) => i.path.includes('status'))).toBe(true)
      }
    })
  })

  describe('generateCharacterization', () => {
    it('POSTs to /{id}/generation/{sourceKey}', async () => {
      ok({ id: 1, status: 'PENDING', sourceKey: 'CDM_A' })

      const result = await generateCharacterization(1, 'CDM_A')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(1)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohort-characterization/1/generation/CDM_A')
      expect(init.method).toBe('POST')
    })

    it('normalizes a Spring Batch JobExecution response', async () => {
      ok({ executionId: 456, status: 'STARTING' })

      const result = await generateCharacterization(1, 'CDM_A')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(456)
        expect(result.data.sourceKey).toBe('CDM_A')
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('resolves with null instead of fabricating an id when the job response carries no execution id', async () => {
      ok({ jobParameters: { jobName: 'cohortCharacterization' }, exitStatus: 'UNKNOWN' })

      const result = await generateCharacterization(1, 'CDM_A')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        'CharacterizationService',
        'Generation response from POST /cohort-characterization/1/generation/CDM_A carried no execution id',
        expect.anything()
      )
    })

    it('falls back to the job `id` when `executionId` is absent', async () => {
      ok({ id: 789 })

      const result = await generateCharacterization(1, 'CDM_A')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data?.id).toBe(789)
        expect(result.data?.status).toBe('STARTING')
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('reports a status carrying failure when neither the execution nor job-execution shape parses', async () => {
      ok({ status: 'NOT_A_REAL_STATUS' })

      const result = await generateCharacterization(1, 'CDM_A')

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe(
          'Invalid response from POST /cohort-characterization/1/generation/CDM_A'
        )
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(issues.some((i: { path: string[] }) => i.path.includes('status'))).toBe(true)
      }
    })
  })

  describe('cancelCharacterizationGeneration', () => {
    it('DELETEs /{id}/generation/{sourceKey}', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '' })

      const result = await cancelCharacterizationGeneration(1, 'CDM_A')

      expect(result.success).toBe(true)
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohort-characterization/1/generation/CDM_A')
      expect(init.method).toBe('DELETE')
    })
  })

  describe('getCharacterizationDesignSnapshot', () => {
    it('returns the raw design', async () => {
      ok({ some: 'snapshot' })
      const result = await getCharacterizationDesignSnapshot(99)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ some: 'snapshot' })
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })
  })

  describe('getCharacterizationResultCount', () => {
    it('returns a number', async () => {
      ok(123)
      const result = await getCharacterizationResultCount(1)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(123)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('reports a non-number response as ApiResult failure', async () => {
      ok({ count: 5 })
      const result = await getCharacterizationResultCount(1)
      expect(result.success).toBe(false)
    })
  })

  describe('getCharacterizationResults', () => {
    it('returns the raw array', async () => {
      ok([{ row: 1 }, { row: 2 }])

      const result = await getCharacterizationResults(1, { thresholdValuePct: 0 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('flattens the `{ reports: [...] }` wrapper', async () => {
      ok({ reports: [{ analysisId: 1, items: [{ row: 1 }] }, { analysisId: 2, items: [{ row: 2 }] }] })

      const result = await getCharacterizationResults(1, { thresholdValuePct: 0 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('reports an unexpected shape as ApiResult failure carrying the offending payload', async () => {
      ok({ not: 'an array' })

      const result = await getCharacterizationResults(1, { thresholdValuePct: 0 })

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected the result to fail')
      } else {
        expect(result.error.message).toBe(
          'Invalid response from POST /cohort-characterization/generation/1/result'
        )
        expect(result.error.status).toBe(0)
        expect(JSON.parse(result.error.body as string)).toEqual({ not: 'an array' })
      }
    })
  })

  describe('explorePrevalence', () => {
    it('GETs the explore prevalence URL', async () => {
      ok({ stats: 'data' })

      const result = await explorePrevalence(1, 2, 3, 4)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ stats: 'data' })
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/cohort-characterization/generation/1/explore/prevalence/2/3/4')
    })
  })
})
