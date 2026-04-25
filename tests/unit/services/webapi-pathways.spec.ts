import { describe, it, expect, vi, beforeEach } from 'vitest'
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
} from '@/services/webapi'
import * as httpClient from '@/services/http-client'

vi.mock('@/services/http-client')

const samplePathway = {
  id: 1,
  name: 'Test',
  design: {
    targetCohorts: [], eventCohorts: [],
    combinationWindow: 30, minCellCount: 5, maxDepth: 5, allowRepeats: false,
  },
  tags: [],
}

describe('webapi pathway CRUD', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listPathways GETs /pathway-analysis with size param', async () => {
    vi.mocked(httpClient.httpGet).mockResolvedValue([samplePathway])
    const result = await listPathways()
    expect(httpClient.httpGet).toHaveBeenCalledWith('/pathway-analysis?size=10000')
    expect(result.success).toBe(true)
  })

  it('getPathway GETs /pathway-analysis/:id', async () => {
    vi.mocked(httpClient.httpGet).mockResolvedValue(samplePathway)
    const result = await getPathway(1)
    expect(httpClient.httpGet).toHaveBeenCalledWith('/pathway-analysis/1')
    expect(result.success).toBe(true)
  })

  it('createPathway POSTs to /pathway-analysis', async () => {
    vi.mocked(httpClient.httpPost).mockResolvedValue(samplePathway)
    await createPathway(samplePathway as never)
    expect(httpClient.httpPost).toHaveBeenCalledWith('/pathway-analysis', samplePathway)
  })

  it('savePathway PUTs to /pathway-analysis/:id', async () => {
    vi.mocked(httpClient.httpPut).mockResolvedValue(samplePathway)
    await savePathway(1, samplePathway as never)
    expect(httpClient.httpPut).toHaveBeenCalledWith('/pathway-analysis/1', samplePathway)
  })

  it('copyPathway POSTs to /pathway-analysis/:id', async () => {
    vi.mocked(httpClient.httpPost).mockResolvedValue({ ...samplePathway, id: 2 })
    await copyPathway(1)
    expect(httpClient.httpPost).toHaveBeenCalledWith('/pathway-analysis/1', undefined)
  })

  it('deletePathway DELETEs /pathway-analysis/:id', async () => {
    vi.mocked(httpClient.httpDelete).mockResolvedValue(undefined)
    const ok = await deletePathway(1)
    expect(httpClient.httpDelete).toHaveBeenCalledWith('/pathway-analysis/1')
    expect(ok).toBe(true)
  })

  it('existsPathway encodes name and uses 0 when id absent', async () => {
    vi.mocked(httpClient.httpGet).mockResolvedValue(0)
    await existsPathway('My Pathway')
    expect(httpClient.httpGet).toHaveBeenCalledWith(
      '/pathway-analysis/0/exists?name=My%20Pathway'
    )
  })
})

describe('webapi pathway tags + diagnostics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('assignPathwayTag POSTs /pathway-analysis/:id/tag/:tagId', async () => {
    vi.mocked(httpClient.httpPost).mockResolvedValue(undefined)
    await assignPathwayTag(1, 7)
    expect(httpClient.httpPost).toHaveBeenCalledWith('/pathway-analysis/1/tag/7', undefined)
  })

  it('unassignPathwayTag DELETEs /pathway-analysis/:id/tag/:tagId', async () => {
    vi.mocked(httpClient.httpDelete).mockResolvedValue(undefined)
    await unassignPathwayTag(1, 7)
    expect(httpClient.httpDelete).toHaveBeenCalledWith('/pathway-analysis/1/tag/7')
  })

  it('runPathwayDiagnostics POSTs /pathway-analysis/check', async () => {
    vi.mocked(httpClient.httpPost).mockResolvedValue([])
    await runPathwayDiagnostics({ design: {} } as never)
    expect(httpClient.httpPost).toHaveBeenCalledWith('/pathway-analysis/check', { design: {} })
  })
})

import {
  listPathwayExecutions,
  getPathwayExecution,
  getPathwayResults,
  generatePathway,
  cancelPathwayGeneration,
  getPathwayDesignByGeneration,
} from '@/services/webapi'

describe('webapi pathway executions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listPathwayExecutions GETs /pathway-analysis/:id/generation', async () => {
    vi.mocked(httpClient.httpGet).mockResolvedValue([])
    await listPathwayExecutions(1)
    expect(httpClient.httpGet).toHaveBeenCalledWith('/pathway-analysis/1/generation')
  })

  it('getPathwayExecution GETs /pathway-analysis/generation/:gid', async () => {
    vi.mocked(httpClient.httpGet).mockResolvedValue({
      id: 99, status: 'COMPLETED', sourceKey: 'cdm',
    })
    const res = await getPathwayExecution(99)
    expect(httpClient.httpGet).toHaveBeenCalledWith('/pathway-analysis/generation/99')
    expect(res.success).toBe(true)
  })

  it('getPathwayResults GETs /pathway-analysis/generation/:gid/result', async () => {
    vi.mocked(httpClient.httpGet).mockResolvedValue({
      pathwayGroups: [], eventCodes: [],
    })
    const res = await getPathwayResults(99)
    expect(httpClient.httpGet).toHaveBeenCalledWith('/pathway-analysis/generation/99/result')
    expect(res.success).toBe(true)
  })

  it('generatePathway POSTs /pathway-analysis/:id/generation/:source', async () => {
    vi.mocked(httpClient.httpPost).mockResolvedValue({
      id: 99, status: 'STARTING', sourceKey: 'cdm',
    })
    await generatePathway(1, 'cdm')
    expect(httpClient.httpPost).toHaveBeenCalledWith(
      '/pathway-analysis/1/generation/cdm', undefined
    )
  })

  it('cancelPathwayGeneration DELETEs the same path', async () => {
    vi.mocked(httpClient.httpDelete).mockResolvedValue(undefined)
    await cancelPathwayGeneration(1, 'cdm')
    expect(httpClient.httpDelete).toHaveBeenCalledWith('/pathway-analysis/1/generation/cdm')
  })

  it('getPathwayDesignByGeneration GETs /generation/:gid/design', async () => {
    vi.mocked(httpClient.httpGet).mockResolvedValue({
      name: 'X',
      design: {
        targetCohorts: [], eventCohorts: [],
        combinationWindow: 30, minCellCount: 5, maxDepth: 5, allowRepeats: false,
      },
    })
    await getPathwayDesignByGeneration(99)
    expect(httpClient.httpGet).toHaveBeenCalledWith('/pathway-analysis/generation/99/design')
  })
})
