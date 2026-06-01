import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defaultAppConfig } from '@/config/app-config.defaults'

describe('app-config.loader', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    mockFetch = vi.fn()
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadAppConfig', () => {
    it('should return overrides from config-local.json when found', async () => {
      const overrides = {
        api: { url: 'http://localhost:8080/WebAPI' },
        userAuthenticationEnabled: true,
        enableSkipLogin: true,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(overrides),
      } as unknown as Response)

      const { loadAppConfig } = await import('@/config/app-config.loader')
      const config = await loadAppConfig()

      expect(mockFetch).toHaveBeenCalledWith('./config-local.json')
      expect(config.api.url).toBe('http://localhost:8080/WebAPI')
      expect(config.userAuthenticationEnabled).toBe(true)
      expect(config.enableSkipLogin).toBe(true)
    })

    it('should merge overrides with defaults (non-overridden values remain)', async () => {
      const overrides = {
        userAuthenticationEnabled: true,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(overrides),
      } as unknown as Response)

      const { loadAppConfig } = await import('@/config/app-config.loader')
      const config = await loadAppConfig()

      expect(config.userAuthenticationEnabled).toBe(true)
      expect(config.api.url).toBe(defaultAppConfig.api.url)
      expect(config.enablePermissionManagement).toBe(defaultAppConfig.enablePermissionManagement)
      expect(config.refreshTokenThreshold).toBe(defaultAppConfig.refreshTokenThreshold)
      expect(config.defaultLocale).toBe(defaultAppConfig.defaultLocale)
    })

    it('should deep-merge api overrides with default api config', async () => {
      const overrides = {
        api: { url: 'https://custom.example.com/WebAPI' },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(overrides),
      } as unknown as Response)

      const { loadAppConfig } = await import('@/config/app-config.loader')
      const config = await loadAppConfig()

      expect(config.api.url).toBe('https://custom.example.com/WebAPI')
    })

    it('should return defaults when config-local.json is not found (404)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as unknown as Response)

      const { loadAppConfig } = await import('@/config/app-config.loader')
      const config = await loadAppConfig()

      expect(config).toEqual(defaultAppConfig)
    })

    it('should return defaults when fetch throws a network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { loadAppConfig } = await import('@/config/app-config.loader')
      const config = await loadAppConfig()

      expect(config).toEqual(defaultAppConfig)
    })
  })

  describe('getAppConfig', () => {
    it('should throw if called before loadAppConfig', async () => {
      const { getAppConfig } = await import('@/config/app-config.loader')

      expect(() => getAppConfig()).toThrowError(
        '[AppConfig] getAppConfig() called before loadAppConfig()'
      )
    })

    it('should return resolved config after loadAppConfig completes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as unknown as Response)

      const { loadAppConfig, getAppConfig } = await import('@/config/app-config.loader')
      await loadAppConfig()

      const config = getAppConfig()
      expect(config).toEqual(defaultAppConfig)
    })
  })
})
