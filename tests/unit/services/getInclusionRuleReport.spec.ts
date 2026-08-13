import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { getInclusionRuleReport } from '@/services/report.service'

describe('getInclusionRuleReport', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    global.fetch = mockFetch as unknown as typeof fetch
  })

  it('parses the canonical WebAPI 3.0 response and decodes treemapData', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          summary: { baseCount: 1000, finalCount: 820, lostCount: 180, percentMatched: '82.00' },
          inclusionRuleStats: [
            {
              id: 0,
              name: 'No prior diabetes',
              countSatisfying: 950,
              percentSatisfying: '95.00',
              percentExcluded: '5.00',
            },
          ],
          treemapData: '{"name":"Everyone","children":[{"name":"1","size":820}]}',
          prevalenceThreshold: 0.01,
        }),
    })

    const result = await getInclusionRuleReport(1, 'EUNOMIA', 1)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.summary.finalCount).toBe(820)
    expect(result.data.inclusionRuleStats).toHaveLength(1)
    expect(result.data.treemap).toEqual({ name: 'Everyone', children: [{ name: '1', size: 820 }] })
  })

  it('passes the mode query parameter through to the URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          summary: { baseCount: 0, finalCount: 0, lostCount: 0, percentMatched: null },
          inclusionRuleStats: [],
          treemapData: '',
        }),
    })

    await getInclusionRuleReport(42, 'EUNOMIA', 0)

    const calledUrl = mockFetch.mock.calls[0]![0]
    expect(calledUrl).toContain('/cohortdefinition/42/report/EUNOMIA/inclusion?mode=0')
  })

  it('returns a failure when the response shape does not validate', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ unexpected: 'shape' }),
    })

    const result = await getInclusionRuleReport(1, 'EUNOMIA')
    expect(result.success).toBe(false)
    if (result.success) {
      expect.fail('expected getInclusionRuleReport to fail')
    } else {
      expect(result.error.status).toBe(0)
    }
  })

  it('returns a report with treemap=null when treemapData is malformed JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          summary: { baseCount: 1, finalCount: 1, lostCount: 0, percentMatched: '100' },
          inclusionRuleStats: [],
          treemapData: 'not json',
        }),
    })

    const result = await getInclusionRuleReport(1, 'EUNOMIA')
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.treemap).toBeNull()
  })

  it('surfaces the status when a report is forbidden', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => 'no results access',
    })

    const { getInclusionRuleReport } = await import('@/services/report.service')
    const result = await getInclusionRuleReport(1, 'SYNPUF1K', 1)

    expect(result.success).toBe(false)
    if (result.success) {
      expect.fail('expected getInclusionRuleReport to fail')
    } else {
      expect(result.error.status).toBe(403)
    }
  })

  it('still returns the summary and inclusion rule stats when treemapData is omitted (#202)', async () => {
    // The server omits treemapData when there is nothing to plot. Requiring
    // it in the schema used to fail validation for the whole envelope and
    // discard an otherwise valid, non-empty report.
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          summary: { baseCount: 65660, finalCount: 65660, lostCount: 0, percentMatched: '100.00' },
          inclusionRuleStats: [
            {
              id: 0,
              name: 'Rule A',
              countSatisfying: 65660,
              percentSatisfying: '100.00',
              percentExcluded: '0.00',
            },
          ],
        }),
    })

    const result = await getInclusionRuleReport(1, 'EUNOMIA', 1)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.summary.finalCount).toBe(65660)
    expect(result.data.inclusionRuleStats).toHaveLength(1)
    expect(result.data.treemap).toBeNull()
  })

  it('still returns the summary and inclusion rule stats when treemapData is null (#202)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          summary: { baseCount: 100, finalCount: 80, lostCount: 20, percentMatched: '80.00' },
          inclusionRuleStats: [
            {
              id: 0,
              name: 'Rule A',
              countSatisfying: 80,
              percentSatisfying: '80.00',
              percentExcluded: '20.00',
            },
          ],
          treemapData: null,
        }),
    })

    const result = await getInclusionRuleReport(1, 'EUNOMIA', 1)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.summary.finalCount).toBe(80)
    expect(result.data.inclusionRuleStats).toHaveLength(1)
    expect(result.data.treemap).toBeNull()
  })
})
