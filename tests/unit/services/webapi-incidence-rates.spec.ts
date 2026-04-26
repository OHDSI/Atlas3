import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpPut: vi.fn(),
  httpDelete: vi.fn(),
}))

import * as http from '@/services/http-client'
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
} from '@/services/webapi'

const ir = {
  id: 1, name: 'X',
  expression: {
    ConceptSets: [], targetIds: [], outcomeIds: [],
    timeAtRisk: {
      start: { DateField: 'StartDate', Offset: 0 },
      end: { DateField: 'EndDate', Offset: 0 },
    },
    strata: [],
  },
  tags: [],
}

beforeEach(() => vi.clearAllMocks())

describe('IR webapi', () => {
  it('listIncidenceRates calls /ir/ and returns parsed list', async () => {
    vi.mocked(http.httpGet).mockResolvedValueOnce([ir])
    const r = await listIncidenceRates()
    expect(http.httpGet).toHaveBeenCalledWith('/ir/')
    expect(r.success).toBe(true)
  })

  it('listIncidenceRates returns failure on parse error', async () => {
    vi.mocked(http.httpGet).mockResolvedValueOnce([{ name: '' }])
    const r = await listIncidenceRates()
    expect(r.success).toBe(false)
  })

  it('getIncidenceRate hits /ir/{id}', async () => {
    vi.mocked(http.httpGet).mockResolvedValueOnce(ir)
    await getIncidenceRate(7)
    expect(http.httpGet).toHaveBeenCalledWith('/ir/7')
  })

  it('createIncidenceRate POSTs to /ir/', async () => {
    vi.mocked(http.httpPost).mockResolvedValueOnce(ir)
    await createIncidenceRate(ir as never)
    expect(http.httpPost).toHaveBeenCalledWith('/ir/', ir)
  })

  it('saveIncidenceRate PUTs to /ir/{id}', async () => {
    vi.mocked(http.httpPut).mockResolvedValueOnce(ir)
    await saveIncidenceRate(7, ir as never)
    expect(http.httpPut).toHaveBeenCalledWith('/ir/7', ir)
  })

  it('copyIncidenceRate GETs /ir/{id}/copy', async () => {
    vi.mocked(http.httpGet).mockResolvedValueOnce(ir)
    await copyIncidenceRate(7)
    expect(http.httpGet).toHaveBeenCalledWith('/ir/7/copy')
  })

  it('deleteIncidenceRate DELETEs /ir/{id}', async () => {
    vi.mocked(http.httpDelete).mockResolvedValueOnce(undefined as never)
    const ok = await deleteIncidenceRate(7)
    expect(http.httpDelete).toHaveBeenCalledWith('/ir/7')
    expect(ok).toBe(true)
  })

  it('existsIncidenceRate encodes the name', async () => {
    vi.mocked(http.httpGet).mockResolvedValueOnce(0)
    await existsIncidenceRate('hello world', 0)
    expect(http.httpGet).toHaveBeenCalledWith('/ir/0/exists?name=hello%20world')
  })

  it('assign and unassign tag use the right verbs', async () => {
    vi.mocked(http.httpPost).mockResolvedValueOnce(undefined as never)
    vi.mocked(http.httpDelete).mockResolvedValueOnce(undefined as never)
    await assignIncidenceRateTag(1, 2)
    await unassignIncidenceRateTag(1, 2)
    expect(http.httpPost).toHaveBeenCalledWith('/ir/1/tag/2', undefined)
    expect(http.httpDelete).toHaveBeenCalledWith('/ir/1/tag/2')
  })

  it('listIncidenceRateInfo hits /ir/{id}/info', async () => {
    vi.mocked(http.httpGet).mockResolvedValueOnce([])
    await listIncidenceRateInfo(7)
    expect(http.httpGet).toHaveBeenCalledWith('/ir/7/info')
  })

  it('getIncidenceRateInfoBySource hits /ir/{id}/info/{src}', async () => {
    vi.mocked(http.httpGet).mockResolvedValueOnce({
      executionInfo: { id: { analysisId: 1, sourceId: 2 }, status: 'PENDING' },
    })
    await getIncidenceRateInfoBySource(7, 'CCAE')
    expect(http.httpGet).toHaveBeenCalledWith('/ir/7/info/CCAE')
  })

  it('generateIncidenceRate GETs /ir/{id}/execute/{src}', async () => {
    vi.mocked(http.httpGet).mockResolvedValueOnce({
      id: { analysisId: 1, sourceId: 2 }, status: 'PENDING',
    })
    await generateIncidenceRate(1, 'CCAE')
    expect(http.httpGet).toHaveBeenCalledWith('/ir/1/execute/CCAE')
  })

  it('cancelIncidenceRateGeneration DELETEs /ir/{id}/execute/{src}', async () => {
    vi.mocked(http.httpDelete).mockResolvedValueOnce(undefined as never)
    const ok = await cancelIncidenceRateGeneration(1, 'CCAE')
    expect(http.httpDelete).toHaveBeenCalledWith('/ir/1/execute/CCAE')
    expect(ok).toBe(true)
  })

  it('deleteIncidenceRateInfo DELETEs /ir/{id}/info/{src}', async () => {
    vi.mocked(http.httpDelete).mockResolvedValueOnce(undefined as never)
    await deleteIncidenceRateInfo(1, 'CCAE')
    expect(http.httpDelete).toHaveBeenCalledWith('/ir/1/info/CCAE')
  })

  it('getIncidenceRateReport encodes targetId/outcomeId', async () => {
    vi.mocked(http.httpGet).mockResolvedValueOnce({
      summary: {
        targetId: 1, outcomeId: 2,
        totalPersons: 0, cases: 0, timeAtRisk: 0, proportion: 0, rate: 0,
      },
      stratifyStats: [],
      treemapData: '{}',
    })
    await getIncidenceRateReport(1, 'CCAE', 10, 20)
    expect(http.httpGet).toHaveBeenCalledWith(
      '/ir/1/report/CCAE?targetId=10&outcomeId=20'
    )
  })
})
