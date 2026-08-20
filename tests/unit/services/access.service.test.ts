import { beforeEach, describe, expect, it, vi } from 'vitest'
import { grantEntityAccess, loadRoleSuggestions, fetchEntityAccessRoles, revokeEntityAccess } from '@/services/access.service'
import type { Role } from '@/models/role.types'

vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpDelete: vi.fn(),
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('access.service', () => {
  let httpGet: typeof import('@/services/http-client').httpGet
  let httpPost: typeof import('@/services/http-client').httpPost
  let httpDelete: typeof import('@/services/http-client').httpDelete

  const role: Role = {
    id: 7,
    name: 'Source Managers',
    description: 'Manage sources',
    createdDate: null,
    modifiedDate: null,
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    const httpClient = await import('@/services/http-client')
    httpGet = httpClient.httpGet
    httpPost = httpClient.httpPost
    httpDelete = httpClient.httpDelete
  })

  it('loads current entity access roles', async () => {
    vi.mocked(httpGet).mockResolvedValue([role])

    const result = await fetchEntityAccessRoles('SOURCE', 123)

    expect(httpGet).toHaveBeenCalledWith('/permission/access/SOURCE/123/WRITE')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual([role])
    }
  })

  it('loads role suggestions', async () => {
    vi.mocked(httpGet).mockResolvedValue([role])

    const result = await loadRoleSuggestions('Source')

    expect(httpGet).toHaveBeenCalledWith('/permission/access/suggest?roleSearch=Source')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data[0]?.name).toBe('Source Managers')
    }
  })

  it('grants access to a role', async () => {
    vi.mocked(httpPost).mockResolvedValue(undefined)

    const result = await grantEntityAccess('SOURCE', 123, 7, 'WRITE')

    expect(httpPost).toHaveBeenCalledWith('/permission/access/SOURCE/123/role/7', {
      accessType: 'WRITE',
    })
    expect(result.success).toBe(true)
  })

  it('revokes access from a role', async () => {
    vi.mocked(httpDelete).mockResolvedValue(undefined)

    const result = await revokeEntityAccess('SOURCE', 123, 7, 'READ')

    expect(httpDelete).toHaveBeenCalledWith('/permission/access/SOURCE/123/role/7', {
      body: { accessType: 'READ' },
    })
    expect(result.success).toBe(true)
  })
})