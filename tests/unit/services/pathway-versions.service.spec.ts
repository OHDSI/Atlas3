import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

vi.mock('@/services/http-client')

let httpClient: typeof import('@/services/http-client')
let getPathwayVersions: typeof import('@/services/pathway-versions.service').getPathwayVersions
let getPathwayVersion: typeof import('@/services/pathway-versions.service').getPathwayVersion
let updatePathwayVersion: typeof import('@/services/pathway-versions.service').updatePathwayVersion
let copyPathwayVersion: typeof import('@/services/pathway-versions.service').copyPathwayVersion

beforeAll(async () => {
  vi.resetModules()
  httpClient = await import('@/services/http-client')
  const svc = await import('@/services/pathway-versions.service')
  getPathwayVersions = svc.getPathwayVersions
  getPathwayVersion = svc.getPathwayVersion
  updatePathwayVersion = svc.updatePathwayVersion
  copyPathwayVersion = svc.copyPathwayVersion
})

describe('pathway-versions.service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getPathwayVersions GETs /pathway-analysis/:id/version/', async () => {
    vi.mocked(httpClient.httpGet).mockResolvedValue([])
    await getPathwayVersions(1)
    expect(httpClient.httpGet).toHaveBeenCalledWith('/pathway-analysis/1/version/')
  })

  it('getPathwayVersion GETs /pathway-analysis/:id/version/:v', async () => {
    vi.mocked(httpClient.httpGet).mockResolvedValue({
      versionDTO: { version: 2, assetId: 1, createdDate: 0, archived: false },
      entityDTO: { name: 'X' },
    })
    await getPathwayVersion(1, 2)
    expect(httpClient.httpGet).toHaveBeenCalledWith('/pathway-analysis/1/version/2')
  })

  it('updatePathwayVersion PUTs payload', async () => {
    vi.mocked(httpClient.httpPut).mockResolvedValue({
      version: 2, assetId: 1, createdDate: 0, archived: true, comment: 'note',
    })
    await updatePathwayVersion(1, 2, { comment: 'note', archived: true })
    expect(httpClient.httpPut).toHaveBeenCalledWith(
      '/pathway-analysis/1/version/2',
      { comment: 'note', archived: true }
    )
  })

  it('copyPathwayVersion PUTs to /createAsset', async () => {
    vi.mocked(httpClient.httpPut).mockResolvedValue({ id: 99 })
    await copyPathwayVersion(1, 2)
    expect(httpClient.httpPut).toHaveBeenCalledWith(
      '/pathway-analysis/1/version/2/createAsset',
      undefined
    )
  })

  describe('error / validation branches', () => {
    it('getPathwayVersions throws on a malformed list payload', async () => {
      vi.mocked(httpClient.httpGet).mockResolvedValueOnce([{ not: 'a version' }])
      await expect(getPathwayVersions(1)).rejects.toThrow('Invalid version list')
    })

    it('getPathwayVersions rethrows when the network layer rejects', async () => {
      vi.mocked(httpClient.httpGet).mockRejectedValueOnce(new Error('boom'))
      await expect(getPathwayVersions(1)).rejects.toThrow('boom')
    })

    it('getPathwayVersion throws on a malformed asset payload', async () => {
      vi.mocked(httpClient.httpGet).mockResolvedValueOnce({ wrong: true })
      await expect(getPathwayVersion(1, 2)).rejects.toThrow('Invalid version asset')
    })

    it('updatePathwayVersion throws when the PUT response is invalid', async () => {
      vi.mocked(httpClient.httpPut).mockResolvedValueOnce({ bogus: 1 })
      await expect(updatePathwayVersion(1, 2, { comment: 'x' })).rejects.toThrow(
        'Invalid version update response'
      )
    })

    it('copyPathwayVersion throws when the createAsset response is malformed', async () => {
      vi.mocked(httpClient.httpPut).mockResolvedValueOnce({ noId: true })
      await expect(copyPathwayVersion(1, 2)).rejects.toThrow('Invalid copyVersion response')
    })
  })
})
