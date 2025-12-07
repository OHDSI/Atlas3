/**
 * Auth Configuration Tests
 * Tests for authentication configuration parsing and defaults
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('auth.config', () => {
  let originalEnv: Record<string, string | undefined>

  beforeEach(() => {
    // Store original env values
    originalEnv = {
      VITE_AUTH_ENABLED: import.meta.env.VITE_AUTH_ENABLED,
      VITE_AUTH_SKIP_LOGIN: import.meta.env.VITE_AUTH_SKIP_LOGIN,
      VITE_AUTH_PROVIDERS: import.meta.env.VITE_AUTH_PROVIDERS,
      VITE_AUTH_REFRESH_THRESHOLD: import.meta.env.VITE_AUTH_REFRESH_THRESHOLD,
      VITE_WEBAPI_URL: import.meta.env.VITE_WEBAPI_URL,
      VITE_AUTH_WEBAPI_URL: import.meta.env.VITE_AUTH_WEBAPI_URL,
      VITE_AUTH_PERMISSION_MANAGEMENT: import.meta.env.VITE_AUTH_PERMISSION_MANAGEMENT,
    }
  })

  afterEach(() => {
    // Restore original env values
    Object.keys(originalEnv).forEach(key => {
      if (originalEnv[key] === undefined) {
        delete (import.meta.env as Record<string, unknown>)[key]
      } else {
        (import.meta.env as Record<string, unknown>)[key] = originalEnv[key]
      }
    })
    vi.resetModules()
  })

  describe('AuthConfig interface', () => {
    it('should export AuthConfig type', async () => {
      const module = await import('@/config/auth.config')
      expect(module.defaultAuthConfig).toBeDefined()
      expect(module.authConfig).toBeDefined()
    })
  })

  describe('parseProvidersFromEnv', () => {
    it('should parse valid JSON provider configuration', async () => {
      const providers = [
        { name: 'Google', url: '/auth/google' },
        { name: 'Azure', url: '/auth/azure' }
      ]

      ;(import.meta.env as Record<string, unknown>).VITE_AUTH_PROVIDERS = JSON.stringify(providers)

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.authProviders).toEqual(providers)
      expect(defaultAuthConfig.authProviders).toHaveLength(2)
    })

    it('should return empty array when VITE_AUTH_PROVIDERS is undefined', async () => {
      delete (import.meta.env as Record<string, unknown>).VITE_AUTH_PROVIDERS

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.authProviders).toEqual([])
    })

    it('should return empty array on invalid JSON', async () => {
      (import.meta.env as Record<string, unknown>).VITE_AUTH_PROVIDERS = 'invalid json {'

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.authProviders).toEqual([])
    })

    it('should return empty array on empty string', async () => {
      (import.meta.env as Record<string, unknown>).VITE_AUTH_PROVIDERS = ''

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.authProviders).toEqual([])
    })
  })

  describe('parseBooleanEnv', () => {
    it('should parse "true" as true', async () => {
      (import.meta.env as Record<string, unknown>).VITE_AUTH_ENABLED = 'true'

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(true)
    })

    it('should parse "1" as true', async () => {
      (import.meta.env as Record<string, unknown>).VITE_AUTH_ENABLED = '1'

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(true)
    })

    it('should parse "yes" as true', async () => {
      (import.meta.env as Record<string, unknown>).VITE_AUTH_ENABLED = 'yes'

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(true)
    })

    it('should parse "false" as false', async () => {
      (import.meta.env as Record<string, unknown>).VITE_AUTH_ENABLED = 'false'

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(false)
    })

    it('should parse "0" as false', async () => {
      (import.meta.env as Record<string, unknown>).VITE_AUTH_ENABLED = '0'

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(false)
    })

    it('should use default value when undefined', async () => {
      delete (import.meta.env as Record<string, unknown>).VITE_AUTH_ENABLED

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(false) // default is false
    })

    it('should parse skip login boolean', async () => {
      (import.meta.env as Record<string, unknown>).VITE_AUTH_SKIP_LOGIN = 'true'

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.enableSkipLogin).toBe(true)
    })

    it('should parse permission management boolean', async () => {
      (import.meta.env as Record<string, unknown>).VITE_AUTH_PERMISSION_MANAGEMENT = 'false'

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.enablePermissionManagement).toBe(false)
    })
  })

  describe('parseNumberEnv', () => {
    it('should parse valid number string', async () => {
      (import.meta.env as Record<string, unknown>).VITE_AUTH_REFRESH_THRESHOLD = '7200000'

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.refreshTokenThreshold).toBe(7200000)
    })

    it('should use default value when undefined', async () => {
      delete (import.meta.env as Record<string, unknown>).VITE_AUTH_REFRESH_THRESHOLD

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.refreshTokenThreshold).toBe(1000 * 60 * 60 * 4) // 4 hours default
    })

    it('should use default value on NaN', async () => {
      (import.meta.env as Record<string, unknown>).VITE_AUTH_REFRESH_THRESHOLD = 'not-a-number'

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.refreshTokenThreshold).toBe(1000 * 60 * 60 * 4)
    })

    it('should parse negative numbers', async () => {
      (import.meta.env as Record<string, unknown>).VITE_AUTH_REFRESH_THRESHOLD = '-500'

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.refreshTokenThreshold).toBe(-500)
    })

    it('should parse zero', async () => {
      (import.meta.env as Record<string, unknown>).VITE_AUTH_REFRESH_THRESHOLD = '0'

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.refreshTokenThreshold).toBe(0)
    })
  })

  describe('defaultAuthConfig', () => {
    it('should have correct default structure', async () => {
      // Clear all env vars to get pure defaults
      delete (import.meta.env as Record<string, unknown>).VITE_AUTH_ENABLED
      delete (import.meta.env as Record<string, unknown>).VITE_AUTH_SKIP_LOGIN
      delete (import.meta.env as Record<string, unknown>).VITE_AUTH_PROVIDERS
      delete (import.meta.env as Record<string, unknown>).VITE_AUTH_REFRESH_THRESHOLD
      delete (import.meta.env as Record<string, unknown>).VITE_WEBAPI_URL
      delete (import.meta.env as Record<string, unknown>).VITE_AUTH_WEBAPI_URL
      delete (import.meta.env as Record<string, unknown>).VITE_AUTH_PERMISSION_MANAGEMENT

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig).toMatchObject({
        userAuthenticationEnabled: false,
        enableSkipLogin: false,
        authProviders: [],
        refreshTokenThreshold: 1000 * 60 * 60 * 4, // 4 hours
        webAPIRoot: '/WebAPI',
        enablePermissionManagement: true,
      })
    })

    it('should prioritize VITE_WEBAPI_URL over VITE_AUTH_WEBAPI_URL', async () => {
      (import.meta.env as Record<string, unknown>).VITE_WEBAPI_URL = 'https://webapi.example.com'
      ;(import.meta.env as Record<string, unknown>).VITE_AUTH_WEBAPI_URL = 'https://auth.example.com'

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.webAPIRoot).toBe('https://webapi.example.com')
    })

    it('should use VITE_AUTH_WEBAPI_URL when VITE_WEBAPI_URL is not set', async () => {
      delete (import.meta.env as Record<string, unknown>).VITE_WEBAPI_URL
      ;(import.meta.env as Record<string, unknown>).VITE_AUTH_WEBAPI_URL = 'https://auth.example.com'

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.webAPIRoot).toBe('https://auth.example.com')
    })

    it('should use default /WebAPI when no URLs are set', async () => {
      delete (import.meta.env as Record<string, unknown>).VITE_WEBAPI_URL
      delete (import.meta.env as Record<string, unknown>).VITE_AUTH_WEBAPI_URL

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.webAPIRoot).toBe('/WebAPI')
    })
  })

  describe('authConfig', () => {
    it('should be initialized with defaultAuthConfig values', async () => {
      const { authConfig, defaultAuthConfig } = await import('@/config/auth.config')

      expect(authConfig).toMatchObject(defaultAuthConfig)
    })
  })

  describe('setAuthConfig', () => {
    it('should update authConfig with partial values', async () => {
      vi.resetModules()
      const module = await import('@/config/auth.config')

      const originalEnabled = module.authConfig.userAuthenticationEnabled

      module.setAuthConfig({ userAuthenticationEnabled: !originalEnabled })

      // Re-import to get the updated reference
      const { authConfig } = await import('@/config/auth.config')
      expect(authConfig.userAuthenticationEnabled).toBe(!originalEnabled)
    })

    it('should merge with existing config', async () => {
      vi.resetModules()
      const module = await import('@/config/auth.config')

      const originalRefreshThreshold = module.authConfig.refreshTokenThreshold

      module.setAuthConfig({ userAuthenticationEnabled: true })

      const { authConfig } = await import('@/config/auth.config')
      expect(authConfig.userAuthenticationEnabled).toBe(true)
      expect(authConfig.refreshTokenThreshold).toBe(originalRefreshThreshold) // unchanged
    })

    it('should update multiple properties', async () => {
      vi.resetModules()
      const module = await import('@/config/auth.config')

      module.setAuthConfig({
        userAuthenticationEnabled: true,
        enableSkipLogin: true,
        webAPIRoot: 'https://test.example.com'
      })

      const { authConfig } = await import('@/config/auth.config')
      expect(authConfig.userAuthenticationEnabled).toBe(true)
      expect(authConfig.enableSkipLogin).toBe(true)
      expect(authConfig.webAPIRoot).toBe('https://test.example.com')
    })

    it('should update authProviders array', async () => {
      vi.resetModules()
      const module = await import('@/config/auth.config')

      const newProviders = [
        { name: 'TestProvider', url: '/test' }
      ]

      module.setAuthConfig({ authProviders: newProviders })

      const { authConfig } = await import('@/config/auth.config')
      expect(authConfig.authProviders).toEqual(newProviders)
    })
  })

  describe('default values', () => {
    it('should have 4 hour refresh threshold default', () => {
      const fourHours = 1000 * 60 * 60 * 4
      expect(fourHours).toBe(14400000)
    })

    it('should default to /WebAPI for proxy-based development', async () => {
      delete (import.meta.env as Record<string, unknown>).VITE_WEBAPI_URL
      delete (import.meta.env as Record<string, unknown>).VITE_AUTH_WEBAPI_URL

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.webAPIRoot).toBe('/WebAPI')
    })

    it('should default to permission management enabled', async () => {
      delete (import.meta.env as Record<string, unknown>).VITE_AUTH_PERMISSION_MANAGEMENT

      vi.resetModules()
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.enablePermissionManagement).toBe(true)
    })
  })
})
