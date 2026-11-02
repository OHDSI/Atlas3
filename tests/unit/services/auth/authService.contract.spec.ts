import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const authConfig = vi.hoisted(() => ({ webAPIRoot: 'http://api/' }))

vi.mock('@/config/auth.config', () => ({
  getAuthConfig: () => ({
    webAPIRoot: authConfig.webAPIRoot,
    userAuthenticationEnabled: true,
    refreshTokenThreshold: 300000,
  }),
}))
vi.mock('@/composables/useI18n', async () => (await import('../../../helpers/i18n-mock')).mockUseI18n)
vi.mock('@/services/auth/storageManager', () => ({
  storageManager: {
    getAuthClient: vi.fn(),
    saveAuthClient: vi.fn(),
    clearAuthClient: vi.fn(),
    clearAll: vi.fn(),
    saveToken: vi.fn(),
    getToken: vi.fn(),
    getRunAsTokenStack: vi.fn(() => []),
    hasRunAsSession: vi.fn(() => false),
    getPreviousRunAsToken: vi.fn(),
    pushRunAsToken: vi.fn(),
    popRunAsToken: vi.fn(),
    replaceActiveRunAsToken: vi.fn(),
    clearRunAsTokenStack: vi.fn(),
    getLogoutUrl: vi.fn(),
  },
}))
vi.mock('@/services/auth/tokenManager', () => ({
  tokenManager: {
    parseToken: vi.fn(),
    isTokenExpired: vi.fn(() => false),
  },
}))
vi.mock('@/services/auth/refreshManager', () => ({
  refreshManager: { scheduleRefresh: vi.fn() },
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { authService, parseUserInfo } from '@/services/auth/authService'
import { storageManager } from '@/services/auth/storageManager'
import { tokenManager } from '@/services/auth/tokenManager'
import { useAuthStore } from '@/stores/auth'
import { logger } from '@/utils/logger'
import type { AuthProvider } from '@/models/auth.types'

const NO_TOKEN = 'No token received from server'
const AUTH_FAILED = 'Authentication failed'

const credentialsProvider: AuthProvider = {
  name: 'DB',
  url: 'user/login/db',
  ajax: true,
  icon: 'mdi-database',
  isUseCredentialsForm: true,
}

const ajaxProvider: AuthProvider = {
  name: 'Windows',
  url: 'user/login/windows',
  ajax: true,
  icon: 'mdi-windows',
  isUseCredentialsForm: false,
}

interface FakeResponseInit {
  ok?: boolean
  status?: number
  headers?: Record<string, string>
  json?: () => Promise<unknown>
  text?: () => Promise<string>
  clone?: () => unknown
}

function res(init: FakeResponseInit = {}): Response {
  const map = new Map(Object.entries(init.headers ?? {}))
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers: {
      get: (n: string) => map.get(n) ?? null,
      entries: () => map.entries(),
    },
    json: init.json ?? (() => Promise.resolve({})),
    text: init.text ?? (() => Promise.resolve('')),
    ...(init.clone ? { clone: init.clone } : {}),
  } as unknown as Response
}

const userMe = () => res({ json: () => Promise.resolve({ user: { login: 'u' }, authz: {} }) })

function fetchMock() {
  return vi.mocked(global.fetch)
}

let href = ''
let hash = ''
const originalLocation = window.location

function mockLocation() {
  href = 'http://app/#/home'
  hash = ''
  const loc = {
    get href() {
      return href
    },
    set href(v: string) {
      href = v
    },
    get hash() {
      return hash
    },
  }
  Object.defineProperty(window, 'location', { value: loc, configurable: true, writable: true })
}

describe('authService request contract', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    authConfig.webAPIRoot = 'http://api/'
    vi.mocked(tokenManager.parseToken).mockReturnValue({
      subject: 'u',
      expirationDate: new Date(Date.now() + 3600000),
      isExpired: false,
      payload: {},
    } as unknown as ReturnType<typeof tokenManager.parseToken>)
    vi.mocked(storageManager.getRunAsTokenStack).mockReturnValue([])
    vi.mocked(storageManager.hasRunAsSession).mockReturnValue(false)
    vi.mocked(storageManager.getAuthClient).mockReset().mockReturnValue(null)
    vi.mocked(storageManager.getLogoutUrl).mockReturnValue(null)
    global.fetch = vi.fn()
    mockLocation()
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true, writable: true })
  })

  describe('parseUserInfo', () => {
    it('reads a permission index object and derives the flat list from it', () => {
      const idx = { trexsql: ['trexsql:count'], cohort: ['cohort:read'] }

      const info = parseUserInfo({ user: { login: 'u' }, authz: { permissions: idx } })

      expect(info.permissionIdx).toBe(idx)
      expect(info.trexsqlCacheEnabled).toBe(true)
    })

    it('treats null permissions as none', () => {
      const info = parseUserInfo({ login: 'u', permissions: null })

      expect(info.permissionIdx).toEqual({})
      expect(info.trexsqlCacheEnabled).toBe(false)
    })

    it('ignores a scalar permissions value', () => {
      const info = parseUserInfo({ login: 'u', permissions: 'trexsql:count' })

      expect(info.permissionIdx).toEqual({})
      expect(info.trexsqlCacheEnabled).toBe(false)
    })

    it('copies every entity access map from authz', () => {
      const maps = {
        cohortDefinitionAccess: { 1: 'a' },
        conceptSetAccess: { 2: 'b' },
        cohortCharacterizationAccess: { 3: 'c' },
        feAnalysisAccess: { 4: 'd' },
        pathwayAccess: { 5: 'e' },
        incidenceRateAccess: { 6: 'f' },
        reusableAccess: { 7: 'g' },
        sourceAccess: { 8: 'h' },
      }

      const info = parseUserInfo({ user: { login: 'u' }, authz: { permissions: [], ...maps } })

      expect(info.entityAccess).toEqual({
        cohortDefinition: maps.cohortDefinitionAccess,
        conceptSet: maps.conceptSetAccess,
        cohortCharacterization: maps.cohortCharacterizationAccess,
        feAnalysis: maps.feAnalysisAccess,
        pathway: maps.pathwayAccess,
        incidenceRate: maps.incidenceRateAccess,
        reusable: maps.reusableAccess,
        source: maps.sourceAccess,
      })
    })

    it('enables the trexsql cache for holders of the global wildcard', () => {
      expect(parseUserInfo({ login: 'u', permissions: ['*'] }).trexsqlCacheEnabled).toBe(true)
    })

    it('does not enable the trexsql cache for unrelated permissions', () => {
      expect(parseUserInfo({ login: 'u', permissions: ['cohort:read'] }).trexsqlCacheEnabled).toBe(false)
    })

    it('prefers an explicit trexsqlCacheEnabled flag over permissions', () => {
      expect(
        parseUserInfo({ login: 'u', permissions: ['*'], trexsqlCacheEnabled: false }).trexsqlCacheEnabled
      ).toBe(false)
    })

    it('defaults a missing login to an empty string', () => {
      const info = parseUserInfo({ user: {} })

      expect(info.login).toBe('')
      expect(info.displayName).toBe('')
    })
  })

  describe('login with credentials', () => {
    it('POSTs the form-encoded credentials to the provider url under the API root', async () => {
      fetchMock().mockResolvedValueOnce(res({ json: () => Promise.resolve({ jwt: 'tok' }) })).mockResolvedValueOnce(userMe())

      await authService.login(credentialsProvider, { username: 'a b', password: 'p&q' })

      expect(fetchMock().mock.calls[0]).toEqual([
        'http://api/user/login/db',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'login=a+b&password=p%26q',
        },
      ])
      expect(useAuthStore().token).toBe('tok')
    })

    it('adds the missing slash after the API root', async () => {
      authConfig.webAPIRoot = 'http://api'
      fetchMock().mockResolvedValueOnce(res({ json: () => Promise.resolve({ jwt: 'tok' }) })).mockResolvedValueOnce(userMe())

      await authService.login(credentialsProvider, { username: 'u', password: 'p' })

      expect(fetchMock().mock.calls[0]?.[0]).toBe('http://api/user/login/db')
    })

    it('ignores a Bearer header and requires the token in the body', async () => {
      fetchMock().mockResolvedValueOnce(res({ headers: { Bearer: 'hdr' }, json: () => Promise.resolve({}) }))

      await expect(authService.login(credentialsProvider, { username: 'u', password: 'p' })).rejects.toThrow(
        new RegExp(`^${NO_TOKEN}$`)
      )
    })

    it('rejects a non-string jwt with the server message', async () => {
      fetchMock().mockResolvedValueOnce(res({ json: () => Promise.resolve({ jwt: 123, message: 'locked' }) }))

      await expect(authService.login(credentialsProvider, { username: 'u', password: 'p' })).rejects.toThrow(/^locked$/)
    })

    it('reports the no-token message when the body is not JSON', async () => {
      fetchMock().mockResolvedValueOnce(res({ json: () => Promise.reject(new SyntaxError('x')) }))

      await expect(authService.login(credentialsProvider, { username: 'u', password: 'p' })).rejects.toThrow(
        new RegExp(`^${NO_TOKEN}$`)
      )
    })

    it('falls back to the generic failure message when the error response is empty', async () => {
      fetchMock().mockResolvedValueOnce(res({ ok: false, status: 401, text: () => Promise.resolve('') }))

      await expect(authService.login(credentialsProvider, { username: 'u', password: 'p' })).rejects.toThrow(
        new RegExp(`^${AUTH_FAILED}$`)
      )
      expect(useAuthStore().errorMessage).toBe(AUTH_FAILED)
    })

    it('flags authenticating only while the request is in flight', async () => {
      const store = useAuthStore()
      let duringRequest: boolean | undefined
      fetchMock().mockImplementationOnce(async () => {
        duringRequest = store.isAuthenticating
        return res({ ok: false, status: 401, text: () => Promise.resolve('nope') })
      })

      await expect(authService.login(credentialsProvider, { username: 'u', password: 'p' })).rejects.toThrow('nope')

      expect(duringRequest).toBe(true)
      expect(store.isAuthenticating).toBe(false)
    })

    it('stores the generic failure message for a non-Error rejection', async () => {
      fetchMock().mockRejectedValueOnce('offline')

      await expect(authService.login(credentialsProvider, { username: 'u', password: 'p' })).rejects.toBe('offline')
      expect(useAuthStore().errorMessage).toBe(AUTH_FAILED)
    })
  })

  describe('login via ajax provider', () => {
    it('GETs the provider url with browser credentials', async () => {
      fetchMock().mockResolvedValueOnce(res({ headers: { Bearer: 'hdr' } })).mockResolvedValueOnce(userMe())

      await authService.login(ajaxProvider)

      expect(fetchMock().mock.calls[0]).toEqual(['http://api/user/login/windows', { method: 'GET', credentials: 'include' }])
    })

    it('prefers the Bearer header over a jwt in the body', async () => {
      fetchMock()
        .mockResolvedValueOnce(res({ headers: { Bearer: 'hdr' }, json: () => Promise.resolve({ jwt: 'body' }) }))
        .mockResolvedValueOnce(userMe())

      await authService.login(ajaxProvider)

      expect(useAuthStore().token).toBe('hdr')
    })

    it('reads the jwt from a clone of the response when available', async () => {
      const original = res({ json: () => Promise.reject(new Error('body already used')) })
      const withClone = { ...original, clone: () => res({ json: () => Promise.resolve({ jwt: 'cloned' }) }) } as Response
      fetchMock().mockResolvedValueOnce(withClone).mockResolvedValueOnce(userMe())

      await authService.login(ajaxProvider)

      expect(useAuthStore().token).toBe('cloned')
    })
  })

  describe('redeemOTC', () => {
    it('uses the no-token message when the body has neither jwt nor a string message', async () => {
      fetchMock().mockResolvedValueOnce(res({ json: () => Promise.resolve({ message: 7 }) }))

      await expect(authService.redeemOTC('c')).rejects.toThrow(new RegExp(`^${NO_TOKEN}$`))
    })

    it('uses the no-token message when the body is not JSON', async () => {
      fetchMock().mockResolvedValueOnce(res({ json: () => Promise.reject(new Error('x')) }))

      await expect(authService.redeemOTC('c')).rejects.toThrow(new RegExp(`^${NO_TOKEN}$`))
    })

    it('GETs the otc endpoint under the API root', async () => {
      fetchMock().mockResolvedValueOnce(res({ json: () => Promise.resolve({ jwt: 'j' }) }))

      await expect(authService.redeemOTC('a/b')).resolves.toBe('j')
      expect(fetchMock()).toHaveBeenCalledWith('http://api/user/login/otc?code=a%2Fb', { method: 'GET' })
    })
  })

  describe('logout', () => {
    beforeEach(() => {
      useAuthStore().$patch({ token: 'tok' })
    })

    it('invalidates the JWT with the bearer token and clears local state', async () => {
      fetchMock().mockResolvedValueOnce(res())

      await authService.logout()

      expect(fetchMock().mock.calls).toEqual([
        ['http://api/user/logout', { method: 'GET', headers: { Authorization: 'Bearer tok' } }],
      ])
      expect(useAuthStore().token).toBeNull()
      expect(href).toBe('http://app/#/home')
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('calls SAML single logout and follows its redirect', async () => {
      vi.mocked(storageManager.getAuthClient).mockReturnValue('SAML')
      fetchMock()
        .mockResolvedValueOnce(res())
        .mockResolvedValueOnce(res({ json: () => Promise.resolve({ redirect: 'https://idp/slo' }) }))

      await authService.logout()

      expect(fetchMock().mock.calls[1]).toEqual([
        'http://api/user/logout/saml',
        { method: 'GET', headers: { Authorization: 'Bearer tok' } },
      ])
      expect(href).toBe('https://idp/slo')
      expect(useAuthStore().token).toBeNull()
    })

    it.each([
      ['a failed SAML response', res({ ok: false, status: 500, json: () => Promise.resolve({ redirect: 'https://idp/slo' }) })],
      ['a SAML response without redirect', res({ json: () => Promise.resolve({}) })],
      ['a SAML response that is not JSON', res({ json: () => Promise.reject(new Error('x')) })],
    ])('stays on the page after %s', async (_label, samlResponse) => {
      vi.mocked(storageManager.getAuthClient).mockReturnValue('SAML')
      fetchMock().mockResolvedValueOnce(res()).mockResolvedValueOnce(samlResponse)

      await authService.logout()

      expect(href).toBe('http://app/#/home')
      expect(useAuthStore().token).toBeNull()
    })

    it.each([
      ['https://idp/logout', 'https://idp/logout?post_logout_redirect_uri=http%3A%2F%2Fapp%2F%23%2Fhome'],
      ['https://idp/logout?client=x', 'https://idp/logout?client=x&post_logout_redirect_uri=http%3A%2F%2Fapp%2F%23%2Fhome'],
    ])('redirects to the OIDC end-session url %s', async (logoutUrl, expected) => {
      vi.mocked(storageManager.getLogoutUrl).mockReturnValue(logoutUrl)
      fetchMock().mockResolvedValueOnce(res())

      await authService.logout()

      expect(href).toBe(expected)
      expect(fetchMock()).toHaveBeenCalledTimes(1)
    })

    it('still clears local state when reading the auth client throws', async () => {
      vi.mocked(storageManager.getAuthClient).mockImplementation(() => {
        throw new Error('storage blocked')
      })

      await authService.logout()

      expect(useAuthStore().token).toBeNull()
    })
  })

  describe('refreshToken', () => {
    it('does not call the server without a token', async () => {
      const store = useAuthStore()
      const setRefreshing = vi.spyOn(store, 'setRefreshing')

      await expect(authService.refreshToken()).resolves.toBe(false)
      expect(fetchMock()).not.toHaveBeenCalled()
      expect(setRefreshing).not.toHaveBeenCalled()
    })

    it('GETs user/refresh with the bearer token and flags refreshing while in flight', async () => {
      const store = useAuthStore()
      store.$patch({ token: 'old' })
      let duringRequest: boolean | undefined
      fetchMock().mockImplementationOnce(async () => {
        duringRequest = store.isRefreshing
        return res({ json: () => Promise.resolve({ jwt: 'new' }) })
      })

      await expect(authService.refreshToken()).resolves.toBe(true)

      expect(fetchMock()).toHaveBeenCalledWith('http://api/user/refresh', {
        method: 'GET',
        headers: { Authorization: 'Bearer old' },
      })
      expect(duringRequest).toBe(true)
      expect(store.isRefreshing).toBe(false)
      expect(store.token).toBe('new')
      expect(storageManager.replaceActiveRunAsToken).not.toHaveBeenCalled()
    })

    it('returns false for a failed response even if it carries a jwt', async () => {
      const store = useAuthStore()
      store.$patch({ token: 'old' })
      fetchMock().mockResolvedValueOnce(res({ ok: false, status: 401, json: () => Promise.resolve({ jwt: 'new' }) }))

      await expect(authService.refreshToken()).resolves.toBe(false)
      expect(store.token).toBe('old')
    })

    it('keeps a Run-As session in run-as storage', async () => {
      const store = useAuthStore()
      store.$patch({ token: 'old', isRunningAs: true })
      const setToken = vi.spyOn(store, 'setToken')
      fetchMock().mockResolvedValueOnce(res({ json: () => Promise.resolve({ jwt: 'new' }) }))

      await authService.refreshToken()

      expect(setToken).toHaveBeenCalledWith('new', 'run-as')
    })
  })

  describe('fetchUserInfo', () => {
    it('GETs user/me with the bearer token', async () => {
      useAuthStore().$patch({ token: 'tok' })
      fetchMock().mockResolvedValueOnce(userMe())

      await authService.fetchUserInfo()

      expect(fetchMock()).toHaveBeenCalledWith('http://api/user/me', {
        method: 'GET',
        headers: { Authorization: 'Bearer tok' },
      })
    })

    it('GETs user/me without an Authorization header when anonymous', async () => {
      fetchMock().mockResolvedValueOnce(userMe())

      await authService.fetchUserInfo()

      expect(fetchMock()).toHaveBeenCalledWith('http://api/user/me', { method: 'GET', headers: {} })
    })
  })

  describe('runAs', () => {
    beforeEach(() => {
      useAuthStore().$patch({ token: 'admin' })
    })

    it('POSTs the target login with the current token and stores the new token as run-as', async () => {
      const setToken = vi.spyOn(useAuthStore(), 'setToken')
      fetchMock().mockResolvedValueOnce(res({ json: () => Promise.resolve({ jwt: 'target' }) })).mockResolvedValueOnce(userMe())

      await authService.runAs('jane doe')

      expect(fetchMock().mock.calls[0]).toEqual([
        'http://api/user/runas',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Bearer admin' },
          body: 'login=jane+doe',
        },
      ])
      expect(storageManager.pushRunAsToken).toHaveBeenCalledWith('admin', 'target')
      expect(setToken).toHaveBeenCalledWith('target', 'run-as')
    })

    it('reports a missing token for a null body', async () => {
      fetchMock().mockResolvedValueOnce(res({ json: () => Promise.resolve(null) }))

      await expect(authService.runAs('x')).rejects.toThrow(/^No token received from run-as$/)
    })

    it.each([
      [true, 'run-as'],
      [false, 'memory'],
    ])('restores the prior token (outer run-as session %s) when loading the target fails', async (nested, mode) => {
      const setToken = vi.spyOn(useAuthStore(), 'setToken')
      vi.mocked(storageManager.hasRunAsSession).mockReturnValue(nested)
      fetchMock()
        .mockResolvedValueOnce(res({ json: () => Promise.resolve({ jwt: 'target' }) }))
        .mockResolvedValueOnce(res({ ok: false, status: 500 }))

      await expect(authService.runAs('x')).rejects.toThrow('Failed to fetch user info (500)')
      expect(setToken).toHaveBeenLastCalledWith('admin', mode)
    })
  })

  describe('endRunAs', () => {
    it('switches to the previous token in run-as storage', async () => {
      const store = useAuthStore()
      store.$patch({ token: 'target' })
      const setToken = vi.spyOn(store, 'setToken')
      vi.mocked(storageManager.getPreviousRunAsToken).mockReturnValue('admin')
      fetchMock().mockResolvedValueOnce(userMe())

      await authService.endRunAs()

      expect(setToken).toHaveBeenCalledWith('admin', 'run-as')
    })

    it('restores the target token in run-as storage when loading the prior user fails', async () => {
      const store = useAuthStore()
      store.$patch({ token: 'target' })
      const setToken = vi.spyOn(store, 'setToken')
      vi.mocked(storageManager.getPreviousRunAsToken).mockReturnValue('admin')
      fetchMock().mockResolvedValueOnce(res({ ok: false, status: 500 }))

      await expect(authService.endRunAs()).rejects.toThrow()
      expect(setToken).toHaveBeenLastCalledWith('target', 'run-as')
    })
  })

  describe('fetchOAuthProviders', () => {
    it('GETs auth/providers under the API root', async () => {
      fetchMock().mockResolvedValueOnce(res({ json: () => Promise.resolve([]) }))

      await authService.fetchOAuthProviders()

      expect(fetchMock()).toHaveBeenCalledWith('http://api/auth/providers', { method: 'GET' })
    })

    it('returns no providers for a failed response even if it has a body', async () => {
      fetchMock().mockResolvedValueOnce(
        res({ ok: false, status: 500, json: () => Promise.resolve([{ name: 'x', url: 'y' }]) })
      )

      await expect(authService.fetchOAuthProviders()).resolves.toEqual([])
    })
  })
})
