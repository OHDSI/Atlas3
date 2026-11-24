import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

vi.mock('@/services/http-client')

let httpClient: typeof import('@/services/http-client')
let svc: typeof import('@/services/reusable-versions.service')

beforeAll(async () => {
  vi.resetModules()
  httpClient = await import('@/services/http-client')
  svc = await import('@/services/reusable-versions.service')
})

const reusable = { id: 1, name: 'Logic', data: '{}', tags: [] }

describe('reusable-versions.service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists versions from /reusable/:id/version/', async () => {
    vi.mocked(httpClient.httpGet).mockResolvedValue([{ version: 1, assetId: 1, createdDate: 0, archived: false }])
    expect(await svc.getReusableVersions(1)).toHaveLength(1)
    expect(httpClient.httpGet).toHaveBeenCalledWith('/reusable/1/version/')
  })

  it('reads one version with the reusable as it was', async () => {
    vi.mocked(httpClient.httpGet).mockResolvedValue({
      versionDTO: { version: 2, assetId: 1, createdDate: 0, archived: false },
      entityDTO: reusable,
    })
    const asset = await svc.getReusableVersion(1, 2)
    expect(httpClient.httpGet).toHaveBeenCalledWith('/reusable/1/version/2')
    expect(asset.entityDTO.name).toBe('Logic')
  })

  it('updates a version\'s comment and archived flag', async () => {
    vi.mocked(httpClient.httpPut).mockResolvedValue({
      version: 2, assetId: 1, createdDate: 0, archived: true, comment: 'note',
    })
    await svc.updateReusableVersion(1, 2, { comment: 'note', archived: true })
    expect(httpClient.httpPut).toHaveBeenCalledWith('/reusable/1/version/2', { comment: 'note', archived: true })
  })

  it('copies a version into a new reusable', async () => {
    vi.mocked(httpClient.httpPut).mockResolvedValue({ id: 99, name: 'Copy' })
    expect((await svc.copyReusableVersion(1, 2)).id).toBe(99)
    expect(httpClient.httpPut).toHaveBeenCalledWith('/reusable/1/version/2/createAsset')
  })

  it('rejects malformed responses', async () => {
    vi.mocked(httpClient.httpGet).mockResolvedValueOnce([{ not: 'a version' }])
    await expect(svc.getReusableVersions(1)).rejects.toThrow('Invalid version list')
    vi.mocked(httpClient.httpGet).mockResolvedValueOnce({ wrong: true })
    await expect(svc.getReusableVersion(1, 2)).rejects.toThrow('Invalid version asset')
    vi.mocked(httpClient.httpPut).mockResolvedValueOnce({ bogus: 1 })
    await expect(svc.updateReusableVersion(1, 2, {})).rejects.toThrow('Invalid version update response')
    vi.mocked(httpClient.httpPut).mockResolvedValueOnce({ noId: true })
    await expect(svc.copyReusableVersion(1, 2)).rejects.toThrow('Invalid copyVersion response')
  })
})
