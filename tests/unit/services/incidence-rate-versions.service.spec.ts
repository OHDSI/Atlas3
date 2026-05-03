import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
  httpPut: vi.fn(),
}))

// Dynamic imports re-evaluated once per file to guard against module-cache
// pollution from vi.resetModules() in sibling test files (singleFork pool).
let http: typeof import('@/services/http-client')
let getIncidenceRateVersions: typeof import('@/services/incidence-rate-versions.service').getIncidenceRateVersions
let getIncidenceRateVersion: typeof import('@/services/incidence-rate-versions.service').getIncidenceRateVersion
let updateIncidenceRateVersion: typeof import('@/services/incidence-rate-versions.service').updateIncidenceRateVersion
let copyIncidenceRateVersion: typeof import('@/services/incidence-rate-versions.service').copyIncidenceRateVersion

beforeAll(async () => {
  vi.resetModules()
  http = await import('@/services/http-client')
  const svc = await import('@/services/incidence-rate-versions.service')
  getIncidenceRateVersions = svc.getIncidenceRateVersions
  getIncidenceRateVersion = svc.getIncidenceRateVersion
  updateIncidenceRateVersion = svc.updateIncidenceRateVersion
  copyIncidenceRateVersion = svc.copyIncidenceRateVersion
})

beforeEach(() => {
  vi.clearAllMocks()
})

const sampleVersion = {
  assetId: 1, version: 3, comment: 'note', archived: false,
  createdBy: { id: 1, login: 'u', name: 'U' },
  createdDate: 1700000000000,
}
const sampleAsset = {
  versionDTO: sampleVersion,
  entityDTO: { id: 1, name: 'IR', expression: {
    ConceptSets: [], targetIds: [], outcomeIds: [],
    timeAtRisk: { start: { DateField: 'StartDate', Offset: 0 }, end: { DateField: 'EndDate', Offset: 0 } },
    strata: [],
  } },
}

describe('IR versions service', () => {
  it('lists versions at /ir/{id}/version/', async () => {
    vi.mocked(http.httpGet).mockResolvedValueOnce([sampleVersion])
    const r = await getIncidenceRateVersions(7)
    expect(http.httpGet).toHaveBeenCalledWith('/ir/7/version/')
    expect(r.length).toBe(1)
  })

  it('gets a version asset', async () => {
    vi.mocked(http.httpGet).mockResolvedValueOnce(sampleAsset)
    const r = await getIncidenceRateVersion(7, 3)
    expect(http.httpGet).toHaveBeenCalledWith('/ir/7/version/3')
    expect(r.versionDTO.version).toBe(3)
  })

  it('updates a version', async () => {
    vi.mocked(http.httpPut).mockResolvedValueOnce(sampleVersion)
    await updateIncidenceRateVersion(7, 3, { comment: 'x' })
    expect(http.httpPut).toHaveBeenCalledWith('/ir/7/version/3', { comment: 'x' })
  })

  it('copies version → asset', async () => {
    vi.mocked(http.httpPut).mockResolvedValueOnce({ id: 99 })
    const r = await copyIncidenceRateVersion(7, 3)
    expect(http.httpPut).toHaveBeenCalledWith('/ir/7/version/3/createAsset', undefined)
    expect(r.id).toBe(99)
  })
})
