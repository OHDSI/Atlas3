/**
 * datasource.service used to run its own copy of the http-client fetch loop.
 * The copy never handled 401, never sent User-Language and threw away the
 * server's error body, so an expired session turned every dashboard and report
 * into a dead-end error instead of a login prompt. These tests pin the three
 * behaviours it now inherits from the shared client.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockAuthStore = {
  token: null as string | null,
  user: null as { login: string } | null,
  isAuthenticating: false,
  isRefreshing: false,
  clearAuth: vi.fn(),
  openLoginModal: vi.fn(),
}

let userAuthenticationEnabled = true

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

vi.mock('@/config/auth.config', () => ({
  getAuthConfig: () => ({ userAuthenticationEnabled }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockFetch = vi.fn()

function unauthorized(body = 'Unauthorized') {
  return {
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
    text: async () => body,
  }
}

describe('datasource.service authentication handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockFetch)
    mockAuthStore.token = 'expired-token'
    mockAuthStore.isAuthenticating = false
    mockAuthStore.isRefreshing = false
    userAuthenticationEnabled = true
  })

  it('clears the session and opens the login modal when a report returns 401', async () => {
    mockFetch.mockResolvedValueOnce(unauthorized())

    const { getDashboardReport } = await import('@/services/datasource.service')
    await expect(getDashboardReport('TEST')).rejects.toThrow('Unable to load Dashboard report')

    expect(mockAuthStore.clearAuth).toHaveBeenCalledTimes(1)
    expect(mockAuthStore.openLoginModal).toHaveBeenCalledTimes(1)
  })

  it('re-authenticates on a 401 from the data-density report', async () => {
    mockFetch.mockResolvedValueOnce(unauthorized())

    const { getDataDensityReport } = await import('@/services/datasource.service')
    await expect(getDataDensityReport('TEST')).rejects.toThrow('Unable to load Data Density report')

    expect(mockAuthStore.clearAuth).toHaveBeenCalledTimes(1)
    expect(mockAuthStore.openLoginModal).toHaveBeenCalledTimes(1)
  })

  it('re-authenticates on a 401 from the person report', async () => {
    mockFetch.mockResolvedValueOnce(unauthorized())

    const { getPersonReport } = await import('@/services/datasource.service')
    await expect(getPersonReport('TEST')).rejects.toThrow('Unable to load Person report')

    expect(mockAuthStore.clearAuth).toHaveBeenCalledTimes(1)
    expect(mockAuthStore.openLoginModal).toHaveBeenCalledTimes(1)
  })

  it('does not re-prompt while a login or refresh is already running', async () => {
    mockAuthStore.isRefreshing = true
    mockFetch.mockResolvedValueOnce(unauthorized())

    const { getPersonReport } = await import('@/services/datasource.service')
    await expect(getPersonReport('TEST')).rejects.toThrow('Unable to load Person report')

    expect(mockAuthStore.clearAuth).not.toHaveBeenCalled()
    expect(mockAuthStore.openLoginModal).not.toHaveBeenCalled()
  })

  it('clears the session but shows no modal when user authentication is disabled', async () => {
    userAuthenticationEnabled = false
    mockFetch.mockResolvedValueOnce(unauthorized())

    const { getPersonReport } = await import('@/services/datasource.service')
    await expect(getPersonReport('TEST')).rejects.toThrow('Unable to load Person report')

    expect(mockAuthStore.clearAuth).toHaveBeenCalledTimes(1)
    expect(mockAuthStore.openLoginModal).not.toHaveBeenCalled()
  })

  it('does not clear the session on a 403', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => 'no access to this source',
    })

    const { getPersonReport } = await import('@/services/datasource.service')
    await expect(getPersonReport('TEST')).rejects.toThrow('Unable to load Person report')

    expect(mockAuthStore.clearAuth).not.toHaveBeenCalled()
    expect(mockAuthStore.openLoginModal).not.toHaveBeenCalled()
  })

  it('sends the bearer token from the auth store', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '{}' })

    const { getPersonReport } = await import('@/services/datasource.service')
    await getPersonReport('TEST')

    const [, init] = mockFetch.mock.calls[0]
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer expired-token')
  })
})

describe('datasource.service error-body surfacing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockFetch)
    mockAuthStore.token = null
    mockAuthStore.isAuthenticating = false
    mockAuthStore.isRefreshing = false
    userAuthenticationEnabled = true
  })

  it("keeps WebAPI's JSON message instead of a bare retry suggestion", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => JSON.stringify({ message: 'Results daimon not configured for TEST' }),
    })

    const { getDashboardReport } = await import('@/services/datasource.service')
    await expect(getDashboardReport('TEST')).rejects.toThrow(
      'Unable to load Dashboard report: Results daimon not configured for TEST'
    )
  })

  it('keeps a plain-text error body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => 'cdm results schema is empty',
    })

    const { getPersonReport } = await import('@/services/datasource.service')
    await expect(getPersonReport('TEST')).rejects.toThrow(
      'Unable to load Person report: cdm results schema is empty'
    )
  })

  it('keeps the message on the clinical-domain report', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => JSON.stringify({ message: 'unknown report' }),
    })

    const { getClinicalDomainReport } = await import('@/services/datasource.service')
    await expect(getClinicalDomainReport('TEST', 'conditionOccurrence')).rejects.toThrow(
      'Unable to load conditionOccurrence report: unknown report'
    )
  })

  it('caps a stack-trace-sized body so the toast stays readable', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => 'x'.repeat(5000),
    })

    const { getPersonReport } = await import('@/services/datasource.service')
    const error = await getPersonReport('TEST').catch((e: Error) => e)

    expect(error.message).toContain('Unable to load Person report:')
    expect(error.message.length).toBeLessThan(300)
    expect(error.message.endsWith('…')).toBe(true)
  })

  it('falls back to the generic advice when the server sends no body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: '',
      text: async () => '',
    })

    const { getPersonReport } = await import('@/services/datasource.service')
    await expect(getPersonReport('TEST')).rejects.toThrow(
      'Unable to load Person report. Please try again.'
    )
  })
})

describe('datasource.service locale header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockFetch)
    mockAuthStore.token = null
    localStorage.clear()
  })

  it('sends the stored locale so WebAPI can translate its response', async () => {
    localStorage.setItem('locale', 'de')
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '{}' })

    const { getPersonReport } = await import('@/services/datasource.service')
    await getPersonReport('TEST')

    const [, init] = mockFetch.mock.calls[0]
    expect((init.headers as Headers).get('User-Language')).toBe('de')
  })
})
