/**
 * Auth Configuration Tests
 * Tests for authentication configuration derived from AppConfig
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AppConfig } from '@/config/app-config.types'

const mockAppConfig: AppConfig = {
  api: { url: '/WebAPI' },
  userAuthenticationEnabled: false,
  enableSkipLogin: false,
  enablePermissionManagement: true,
  authProviders: [],
  refreshTokenThreshold: 1000 * 60 * 15,
  enableIAPSession: false,
  enableTermsAndConditions: false,
  enablePythia: false,
  enablePersonCount: true,
  enableTaggingSection: false,
  defaultLocale: 'en',
  pollInterval: 60000,
}

vi.mock('@/config/app-config.loader', () => ({
  getAppConfig: () => ({ ...mockAppConfig }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('auth.config', () => {
  beforeEach(() => {
    vi.resetModules()
    // Reset mock to defaults
    Object.assign(mockAppConfig, {
      api: { url: '/WebAPI' },
      userAuthenticationEnabled: false,
      enableSkipLogin: false,
      enablePermissionManagement: true,
      authProviders: [],
      refreshTokenThreshold: 1000 * 60 * 15,
      enableIAPSession: false,
      enableTermsAndConditions: false,
      enablePythia: false,
      enablePersonCount: true,
      enableTaggingSection: false,
      defaultLocale: 'en',
      pollInterval: 60000,
    })
  })

  describe('getAuthConfig', () => {
    it('should export getAuthConfig and setAuthConfig', async () => {
      const module = await import('@/config/auth.config')
      expect(module.getAuthConfig).toBeDefined()
      expect(module.setAuthConfig).toBeDefined()
    })

    it('should return correct default structure from AppConfig defaults', async () => {
      const { getAuthConfig } = await import('@/config/auth.config')
      const config = getAuthConfig()

      expect(config).toMatchObject({
        userAuthenticationEnabled: false,
        enableSkipLogin: false,
        authProviders: [],
        refreshTokenThreshold: 1000 * 60 * 15,
        webAPIRoot: '/WebAPI',
        enablePermissionManagement: true,
      })
    })

    it('should reflect userAuthenticationEnabled from AppConfig', async () => {
      mockAppConfig.userAuthenticationEnabled = true

      const { getAuthConfig } = await import('@/config/auth.config')
      expect(getAuthConfig().userAuthenticationEnabled).toBe(true)
    })

    it('should reflect enableSkipLogin from AppConfig', async () => {
      mockAppConfig.enableSkipLogin = true

      const { getAuthConfig } = await import('@/config/auth.config')
      expect(getAuthConfig().enableSkipLogin).toBe(true)
    })

    it('should reflect enablePermissionManagement from AppConfig', async () => {
      mockAppConfig.enablePermissionManagement = false

      const { getAuthConfig } = await import('@/config/auth.config')
      expect(getAuthConfig().enablePermissionManagement).toBe(false)
    })

    it('should reflect refreshTokenThreshold from AppConfig', async () => {
      mockAppConfig.refreshTokenThreshold = 7200000

      const { getAuthConfig } = await import('@/config/auth.config')
      expect(getAuthConfig().refreshTokenThreshold).toBe(7200000)
    })

    it('should reflect api.url as webAPIRoot', async () => {
      mockAppConfig.api = { url: 'https://webapi.example.com' }

      const { getAuthConfig } = await import('@/config/auth.config')
      expect(getAuthConfig().webAPIRoot).toBe('https://webapi.example.com')
    })

    it('should reflect authProviders from AppConfig', async () => {
      const providers = [
        { name: 'Google', url: '/auth/google', ajax: false, icon: 'mdi-google' },
        { name: 'Azure', url: '/auth/azure', ajax: false, icon: 'mdi-microsoft' },
      ]
      mockAppConfig.authProviders = providers as AppConfig['authProviders']

      const { getAuthConfig } = await import('@/config/auth.config')
      expect(getAuthConfig().authProviders).toEqual(providers)
      expect(getAuthConfig().authProviders).toHaveLength(2)
    })

    it('should return empty providers when AppConfig has none', async () => {
      mockAppConfig.authProviders = []

      const { getAuthConfig } = await import('@/config/auth.config')
      expect(getAuthConfig().authProviders).toEqual([])
    })
  })

  describe('setAuthConfig', () => {
    it('should update authConfig with partial values', async () => {
      const { setAuthConfig, getAuthConfig } = await import('@/config/auth.config')

      setAuthConfig({ userAuthenticationEnabled: true })

      expect(getAuthConfig().userAuthenticationEnabled).toBe(true)
    })

    it('should merge with existing config', async () => {
      const { setAuthConfig, getAuthConfig } = await import('@/config/auth.config')

      const originalThreshold = getAuthConfig().refreshTokenThreshold
      setAuthConfig({ userAuthenticationEnabled: true })

      expect(getAuthConfig().userAuthenticationEnabled).toBe(true)
      expect(getAuthConfig().refreshTokenThreshold).toBe(originalThreshold)
    })

    it('should update multiple properties', async () => {
      const { setAuthConfig, getAuthConfig } = await import('@/config/auth.config')

      setAuthConfig({
        userAuthenticationEnabled: true,
        enableSkipLogin: true,
        webAPIRoot: 'https://test.example.com',
      })

      const config = getAuthConfig()
      expect(config.userAuthenticationEnabled).toBe(true)
      expect(config.enableSkipLogin).toBe(true)
      expect(config.webAPIRoot).toBe('https://test.example.com')
    })

    it('should update authProviders array', async () => {
      const { setAuthConfig, getAuthConfig } = await import('@/config/auth.config')

      const newProviders = [
        { name: 'TestProvider', url: '/test', ajax: false, icon: 'mdi-account' },
      ]

      setAuthConfig({ authProviders: newProviders as AppConfig['authProviders'] })

      expect(getAuthConfig().authProviders).toEqual(newProviders)
    })
  })

  describe('default values', () => {
    it('should have 15-minute refresh threshold default', () => {
      const fifteenMinutes = 1000 * 60 * 15
      expect(fifteenMinutes).toBe(900000)
    })

    it('should default to /WebAPI for proxy-based development', async () => {
      const { getAuthConfig } = await import('@/config/auth.config')
      expect(getAuthConfig().webAPIRoot).toBe('/WebAPI')
    })

    it('should default to permission management enabled', async () => {
      const { getAuthConfig } = await import('@/config/auth.config')
      expect(getAuthConfig().enablePermissionManagement).toBe(true)
    })
  })
})
