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

const expressionObj = {
  ConceptSets: [], targetIds: [], outcomeIds: [],
  timeAtRisk: {
    start: { DateField: 'StartDate', Offset: 0 },
    end: { DateField: 'EndDate', Offset: 0 },
  },
  strata: [],
}

// What the OHDSI WebAPI sends/accepts on the wire — `expression` is a
// JSON string.
const irWire = {
  id: 1, name: 'X',
  expression: JSON.stringify(expressionObj),
  tags: [],
}

// Internal IR shape used by stores/composables — `expression` is parsed.
const irInternal = {
  id: 1, name: 'X',
  expression: expressionObj,
  tags: [],
}

beforeEach(() => vi.clearAllMocks())

describe('IR webapi', () => {
  it('listIncidenceRates calls /ir/ and returns parsed summary list', async () => {
    vi.mocked(http.httpGet).mockResolvedValueOnce([{ id: 1, name: 'X', tags: [] }])
    const r = await listIncidenceRates()
    expect(http.httpGet).toHaveBeenCalledWith('/ir/')
    expect(r.success).toBe(true)
  })

  it('listIncidenceRates returns failure on parse error', async () => {
    vi.mocked(http.httpGet).mockResolvedValueOnce([{ name: '', id: 'oops' }])
    const r = await listIncidenceRates()
    expect(r.success).toBe(false)
  })

  it('getIncidenceRate hits /ir/{id} and decodes expression JSON', async () => {
    vi.mocked(http.httpGet).mockResolvedValueOnce(irWire)
    const r = await getIncidenceRate(7)
    expect(http.httpGet).toHaveBeenCalledWith('/ir/7')
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.expression.timeAtRisk.start.DateField).toBe('StartDate')
  })

  it('createIncidenceRate POSTs to /ir/ with expression as JSON string', async () => {
    vi.mocked(http.httpPost).mockResolvedValueOnce(irWire)
    await createIncidenceRate(irInternal as never)
    const [path, body] = vi.mocked(http.httpPost).mock.calls[0]
    expect(path).toBe('/ir/')
    expect(typeof (body as { expression: unknown }).expression).toBe('string')
  })

  it('saveIncidenceRate PUTs to /ir/{id} with expression as JSON string', async () => {
    vi.mocked(http.httpPut).mockResolvedValueOnce(irWire)
    await saveIncidenceRate(7, irInternal as never)
    const [path, body] = vi.mocked(http.httpPut).mock.calls[0]
    expect(path).toBe('/ir/7')
    expect(typeof (body as { expression: unknown }).expression).toBe('string')
  })

  it('copyIncidenceRate GETs /ir/{id}/copy and decodes expression', async () => {
    vi.mocked(http.httpGet).mockResolvedValueOnce(irWire)
    const r = await copyIncidenceRate(7)
    expect(http.httpGet).toHaveBeenCalledWith('/ir/7/copy')
    expect(r.success).toBe(true)
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
