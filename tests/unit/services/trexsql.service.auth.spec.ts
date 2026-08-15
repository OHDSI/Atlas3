/**
 * trexsql.service issued raw fetch calls, so an expired session turned the
 * cohort-builder count and the cache screens into a plain error with no way
 * back in. Routing through the shared http client is what makes a 401 clear the
 * session and open the login modal; these tests pin that, and that the
 * status-specific meanings the endpoints carry survived the move.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockAuthStore = {
  token: 'expired-token' as string | null,
  user: null as { login: string } | null,
  isAuthenticating: false,
  isRefreshing: false,
  clearAuth: vi.fn(),
  openLoginModal: vi.fn(),
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

vi.mock('@/config/auth.config', () => ({
  getAuthConfig: () => ({ userAuthenticationEnabled: true }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockFetch = vi.fn()

function unauthorized() {
  return { ok: false, status: 401, statusText: 'Unauthorized', text: async () => '' }
}

describe('trexsql.service authentication handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockFetch)
    mockAuthStore.token = 'expired-token'
    mockAuthStore.isAuthenticating = false
    mockAuthStore.isRefreshing = false
  })

  it('re-authenticates when the patient count returns 401', async () => {
    mockFetch.mockResolvedValueOnce(unauthorized())

    const { getPatientCount } = await import('@/services/trexsql.service')
    await expect(getPatientCount('CDM', {})).rejects.toThrow()

    expect(mockAuthStore.clearAuth).toHaveBeenCalledTimes(1)
    expect(mockAuthStore.openLoginModal).toHaveBeenCalledTimes(1)
  })

  it('re-authenticates when the cache status returns 401', async () => {
    mockFetch.mockResolvedValueOnce(unauthorized())

    const { getCacheStatus } = await import('@/services/trexsql.service')
    await expect(getCacheStatus('CDM')).rejects.toThrow('Failed to get cache status')

    expect(mockAuthStore.clearAuth).toHaveBeenCalledTimes(1)
    expect(mockAuthStore.openLoginModal).toHaveBeenCalledTimes(1)
  })

  it('re-authenticates when a cache build returns 401', async () => {
    mockFetch.mockResolvedValueOnce(unauthorized())

    const { buildCache } = await import('@/services/trexsql.service')
    await expect(buildCache('CDM')).rejects.toThrow('Build failed')

    expect(mockAuthStore.clearAuth).toHaveBeenCalledTimes(1)
    expect(mockAuthStore.openLoginModal).toHaveBeenCalledTimes(1)
  })

  it('sends the locale so WebAPI can translate its response', async () => {
    localStorage.setItem('locale', 'de')
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '{}' })

    const { getCacheStatus } = await import('@/services/trexsql.service')
    await getCacheStatus('CDM')

    const [, init] = mockFetch.mock.calls[0]
    expect((init.headers as Headers).get('User-Language')).toBe('de')
    localStorage.removeItem('locale')
  })

  it("keeps circe's message on a 422 so the banner can name the broken rule", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      text: async () => JSON.stringify({ message: 'Inclusion rule 2 has no start window' }),
    })

    const { getInclusionStats } = await import('@/services/trexsql.service')
    const error = await getInclusionStats('CDM', {}).catch((e: Error) => e)

    expect(error.name).toBe('InvalidExpressionError')
    expect(error.message).toBe('Inclusion rule 2 has no start window')
  })

  it('falls back to a generic sentence when a 422 carries no message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      text: async () => '',
    })

    const { getPatientCount } = await import('@/services/trexsql.service')
    const error = await getPatientCount('CDM', {}).catch((e: Error) => e)

    expect(error.name).toBe('InvalidExpressionError')
    expect(error.message).toBe('The cohort expression is incomplete or invalid.')
  })
})
