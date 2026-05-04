import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

vi.mock('@/services/http-client')

let httpClient: typeof import('@/services/http-client')
let listPathways: typeof import('@/services/webapi').listPathways
let getPathway: typeof import('@/services/webapi').getPathway
let createPathway: typeof import('@/services/webapi').createPathway
let savePathway: typeof import('@/services/webapi').savePathway
let deletePathway: typeof import('@/services/webapi').deletePathway
let copyPathway: typeof import('@/services/webapi').copyPathway
let existsPathway: typeof import('@/services/webapi').existsPathway
let assignPathwayTag: typeof import('@/services/webapi').assignPathwayTag
let unassignPathwayTag: typeof import('@/services/webapi').unassignPathwayTag
let runPathwayDiagnostics: typeof import('@/services/webapi').runPathwayDiagnostics
let listPathwayExecutions: typeof import('@/services/webapi').listPathwayExecutions
let getPathwayExecution: typeof import('@/services/webapi').getPathwayExecution
let getPathwayResults: typeof import('@/services/webapi').getPathwayResults
let generatePathway: typeof import('@/services/webapi').generatePathway
let cancelPathwayGeneration: typeof import('@/services/webapi').cancelPathwayGeneration
let getPathwayDesignByGeneration: typeof import('@/services/webapi').getPathwayDesignByGeneration

beforeAll(async () => {
  vi.resetModules()
  httpClient = await import('@/services/http-client')
  const webapi = await import('@/services/webapi')
  listPathways = webapi.listPathways
  getPathway = webapi.getPathway
  createPathway = webapi.createPathway
  savePathway = webapi.savePathway
  deletePathway = webapi.deletePathway
  copyPathway = webapi.copyPathway
  existsPathway = webapi.existsPathway
  assignPathwayTag = webapi.assignPathwayTag
  unassignPathwayTag = webapi.unassignPathwayTag
  runPathwayDiagnostics = webapi.runPathwayDiagnostics
  listPathwayExecutions = webapi.listPathwayExecutions
  getPathwayExecution = webapi.getPathwayExecution
  getPathwayResults = webapi.getPathwayResults
  generatePathway = webapi.generatePathway
  cancelPathwayGeneration = webapi.cancelPathwayGeneration
  getPathwayDesignByGeneration = webapi.getPathwayDesignByGeneration
})

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

describe('webapi pathway CRUD', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listPathways unwraps Spring Page envelope', async () => {
    vi.mocked(httpClient.httpGet).mockResolvedValue({
      content: [samplePathway],
      pageable: {}, totalElements: 1,
    })
    const result = await listPathways()
    expect(httpClient.httpGet).toHaveBeenCalledWith('/pathway-analysis?size=10000')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toHaveLength(1)
  })

  it('listPathways also accepts a raw array (legacy/proxy)', async () => {
    vi.mocked(httpClient.httpGet).mockResolvedValue([samplePathway])
    const result = await listPathways()
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
