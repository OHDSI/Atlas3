import { describe, it, expect, vi, beforeEach } from 'vitest'

// Stub the http client so we can drive responses
vi.mock('@/services/http-client', () => ({
  httpClient: vi.fn(),
  getBaseUrl: () => 'http://test/WebAPI',
}))

import { getInclusionRuleReport } from '@/services/webapi'
import { httpClient } from '@/services/http-client'

const httpMock = vi.mocked(httpClient as unknown as ReturnType<typeof vi.fn>)

describe('getInclusionRuleReport', () => {
  beforeEach(() => httpMock.mockReset())

  it('parses the canonical WebAPI 3.0 response and decodes treemapData', async () => {
    httpMock.mockResolvedValueOnce({
      summary: { baseCount: 1000, finalCount: 820, lostCount: 180, percentMatched: '82.00' },
      inclusionRuleStats: [
        { id: 0, name: 'No prior diabetes', countSatisfying: 950, percentSatisfying: '95.00', percentExcluded: '5.00' },
      ],
      treemapData: '{"name":"Everyone","children":[{"name":"1","size":820}]}',
      prevalenceThreshold: 0.01,
    })

    const result = await getInclusionRuleReport(1, 'EUNOMIA', 1)

    expect(result).not.toBeNull()
    expect(result?.summary.finalCount).toBe(820)
    expect(result?.inclusionRuleStats).toHaveLength(1)
    expect(result?.treemap).toEqual({ name: 'Everyone', children: [{ name: '1', size: 820 }] })
  })

  it('passes the mode query parameter through to the URL', async () => {
    httpMock.mockResolvedValueOnce({
      summary: { baseCount: 0, finalCount: 0, lostCount: 0, percentMatched: null },
      inclusionRuleStats: [],
      treemapData: '',
    })

    await getInclusionRuleReport(42, 'EUNOMIA', 0)

    const calledUrl = httpMock.mock.calls[0]![0]
    expect(calledUrl).toContain('/cohortdefinition/42/report/EUNOMIA?mode=0')
  })

  it('returns null when the response shape does not validate', async () => {
    httpMock.mockResolvedValueOnce({ unexpected: 'shape' })

    const result = await getInclusionRuleReport(1, 'EUNOMIA')
    expect(result).toBeNull()
  })

  it('returns a report with treemap=null when treemapData is malformed JSON', async () => {
    httpMock.mockResolvedValueOnce({
      summary: { baseCount: 1, finalCount: 1, lostCount: 0, percentMatched: '100' },
      inclusionRuleStats: [],
      treemapData: 'not json',
    })

    const result = await getInclusionRuleReport(1, 'EUNOMIA')
    expect(result).not.toBeNull()
    expect(result?.treemap).toBeNull()
  })
})
