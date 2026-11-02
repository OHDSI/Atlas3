import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
}))

import { httpGet } from '@/services/http-client'
import { getWebApiInfo, isTrexSQLPluginEnabled } from '@/services/webapi-info.service'

describe('webapi-info.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests /info without auth', async () => {
    vi.mocked(httpGet).mockResolvedValue({ version: '3.0.0' })

    const info = await getWebApiInfo()

    expect(httpGet).toHaveBeenCalledWith('/info', { skipAuth: true })
    expect(info.version).toBe('3.0.0')
  })

  it('reports TrexSQL enabled only when configuration.plugins.trexsqlEnabled is true', async () => {
    vi.mocked(httpGet).mockResolvedValue({ configuration: { plugins: { trexsqlEnabled: true } } })
    expect(await isTrexSQLPluginEnabled()).toBe(true)
  })

  it.each([
    ['false', { configuration: { plugins: { trexsqlEnabled: false } } }],
    ['absent key', { configuration: { plugins: {} } }],
    ['no plugins section', { configuration: {} }],
    ['no configuration', {}],
    ['non-boolean value', { configuration: { plugins: { trexsqlEnabled: 'true' } } }],
  ])('reports TrexSQL disabled for %s', async (_label, body) => {
    vi.mocked(httpGet).mockResolvedValue(body)
    expect(await isTrexSQLPluginEnabled()).toBe(false)
  })
})
