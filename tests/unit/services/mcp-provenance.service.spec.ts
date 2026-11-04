/**
 * Unit Tests: MCP provenance service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getProvenance, groupByTrace, type ProvenanceEntry } from '@/services/mcp-provenance.service'
import { ApiError } from '@/services/api-error'

vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function entry(overrides: Partial<ProvenanceEntry> = {}): ProvenanceEntry {
  return {
    id: 1,
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    spanId: '00f067aa0ba902b7',
    parentSpanId: null,
    reasoningStep: 'STEP_2_CONCEPT_SET_CONSOLIDATION',
    tool: 'add_concept_to_set',
    outcome: 'SUCCESS',
    clinicalRationale: 'Core diagnosis concept for the phenotype.',
    evidenceReference: 'SNOMED-CT clinical finding hierarchy',
    errorMessage: null,
    userLogin: 'analyst',
    startedAt: 1_730_700_000_000,
    finishedAt: 1_730_700_000_500,
    ...overrides,
  }
}

describe('McpProvenanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProvenance', () => {
    it('reads the cohort definition provenance endpoint', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockResolvedValue([entry()])

      const result = await getProvenance('cohortdefinition', 42)

      expect(httpGet).toHaveBeenCalledWith('/cohortdefinition/42/mcp-provenance')
      expect(result).toHaveLength(1)
      expect(result[0].clinicalRationale).toBe('Core diagnosis concept for the phenotype.')
    })

    it('reads the concept set provenance endpoint', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockResolvedValue([])

      await getProvenance('conceptset', 7)

      expect(httpGet).toHaveBeenCalledWith('/conceptset/7/mcp-provenance')
    })

    it('treats a 404 from a WebAPI without the MCP server as no history', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockRejectedValue(new ApiError('HTTP 404: Not Found', 404, null))

      await expect(getProvenance('cohortdefinition', 42)).resolves.toEqual([])
    })

    it('rethrows other errors', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockRejectedValue(new ApiError('HTTP 500: boom', 500, null))

      await expect(getProvenance('cohortdefinition', 42)).rejects.toThrow('HTTP 500')
    })

    it('rejects a payload of the wrong shape', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockResolvedValue([{ id: 1, tool: 'x' }])

      await expect(getProvenance('cohortdefinition', 42)).rejects.toThrow('Failed to validate agent history data')
    })
  })

  describe('groupByTrace', () => {
    it('groups calls into sessions ordered by their first call, calls in time order', () => {
      const a = '11111111111111111111111111111111'
      const b = '22222222222222222222222222222222'
      const traces = groupByTrace([
        entry({ id: 4, traceId: b, startedAt: 400 }),
        entry({ id: 2, traceId: a, startedAt: 200, userLogin: 'first' }),
        entry({ id: 3, traceId: a, startedAt: 300 }),
        entry({ id: 1, traceId: b, startedAt: 100, userLogin: 'second' }),
      ])

      expect(traces.map(t => t.traceId)).toEqual([b, a])
      expect(traces[0].entries.map(e => e.id)).toEqual([1, 4])
      expect(traces[0].startedAt).toBe(100)
      expect(traces[0].userLogin).toBe('second')
      expect(traces[1].entries.map(e => e.id)).toEqual([2, 3])
    })
  })
})
