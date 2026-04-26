import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getPathwayVersions,
  getPathwayVersion,
  updatePathwayVersion,
  copyPathwayVersion,
} from '@/services/pathway-versions.service'
import * as httpClient from '@/services/http-client'

vi.mock('@/services/http-client')

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
})
