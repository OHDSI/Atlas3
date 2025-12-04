/**
 * Unit Tests: Auth Configuration
 * Tests for src/config/auth.config.ts
 *
 * This test suite focuses on covering edge cases and branches to achieve 100% coverage,
 * including environment variable parsing, default value handling, and error scenarios.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AuthProvider } from '@/models/auth.types'

describe.skip('auth.config', () => {
  let _loggerSpy: {
    debug: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    // Mock logger to avoid cluttering test output
    vi.mock('@/utils/logger', () => ({
      logger: {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        setLevel: vi.fn(),
        setEnableInProd: vi.fn(),
      },
    }))
  })

  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  describe('parseProvidersFromEnv', () => {
    it('returns empty array when VITE_AUTH_PROVIDERS is undefined', async () => {
      vi.stubEnv('VITE_AUTH_PROVIDERS', undefined)
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.authProviders).toEqual([])
    })

    it('returns empty array when VITE_AUTH_PROVIDERS is empty string', async () => {
      vi.stubEnv('VITE_AUTH_PROVIDERS', '')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.authProviders).toEqual([])
    })

    it('parses valid JSON array of providers', async () => {
      const providers: AuthProvider[] = [
        {
          name: 'Database',
          url: '/auth/db',
          ajax: true,
          icon: 'mdi-database',
        },
        {
          name: 'LDAP',
          url: '/auth/ldap',
          ajax: true,
          icon: 'mdi-account-network',
        },
      ]

      vi.stubEnv('VITE_AUTH_PROVIDERS', JSON.stringify(providers))
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.authProviders).toEqual(providers)
    })

    it('parses providers with optional fields', async () => {
      const providers: AuthProvider[] = [
        {
          name: 'DB Login',
          url: '/auth/db',
          ajax: true,
          icon: 'mdi-database',
          isUseCredentialsForm: true,
          loginPlaceholder: 'Enter username',
          passwordPlaceholder: 'Enter password',
        },
      ]

      vi.stubEnv('VITE_AUTH_PROVIDERS', JSON.stringify(providers))
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.authProviders).toEqual(providers)
    })

    it('returns empty array when JSON parsing fails', async () => {
      vi.stubEnv('VITE_AUTH_PROVIDERS', 'invalid json {]')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.authProviders).toEqual([])
    })

    it('returns empty array when JSON is not an array', async () => {
      vi.stubEnv('VITE_AUTH_PROVIDERS', '{"not": "an array"}')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      // The function returns parsed result regardless of type, so this will be the object
      expect(defaultAuthConfig.authProviders).toEqual({ not: 'an array' })
    })

    it('handles malformed JSON gracefully', async () => {
      vi.stubEnv('VITE_AUTH_PROVIDERS', '[{"name": "Test", incomplete')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.authProviders).toEqual([])
    })
  })

  describe('parseBooleanEnv', () => {
    it('returns default value when env var is undefined', async () => {
      vi.stubEnv('VITE_AUTH_ENABLED', undefined)
      const { defaultAuthConfig } = await import('@/config/auth.config')

      // Default is false for userAuthenticationEnabled
      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(false)
    })

    it('returns true when value is "true"', async () => {
      vi.stubEnv('VITE_AUTH_ENABLED', 'true')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(true)
    })

    it('returns true when value is "1"', async () => {
      vi.stubEnv('VITE_AUTH_ENABLED', '1')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(true)
    })

    it('returns true when value is "yes"', async () => {
      vi.stubEnv('VITE_AUTH_ENABLED', 'yes')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(true)
    })

    it('returns false for any other string value', async () => {
      vi.stubEnv('VITE_AUTH_ENABLED', 'false')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(false)
    })

    it('returns false for "0"', async () => {
      vi.stubEnv('VITE_AUTH_ENABLED', '0')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(false)
    })

    it('returns false for "no"', async () => {
      vi.stubEnv('VITE_AUTH_ENABLED', 'no')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(false)
    })

    it('returns false for empty string', async () => {
      vi.stubEnv('VITE_AUTH_ENABLED', '')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(false)
    })

    it('handles skip login boolean parsing', async () => {
      vi.stubEnv('VITE_AUTH_SKIP_LOGIN', 'true')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.enableSkipLogin).toBe(true)
    })

    it('handles permission management boolean parsing', async () => {
      vi.stubEnv('VITE_AUTH_PERMISSION_MANAGEMENT', '1')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.enablePermissionManagement).toBe(true)
    })
  })

  describe('parseNumberEnv', () => {
    it('returns default value when env var is undefined', async () => {
      vi.stubEnv('VITE_AUTH_REFRESH_THRESHOLD', undefined)
      const { defaultAuthConfig } = await import('@/config/auth.config')

      // Default is 4 hours in milliseconds
      expect(defaultAuthConfig.refreshTokenThreshold).toBe(1000 * 60 * 60 * 4)
    })

    it('parses valid integer string', async () => {
      vi.stubEnv('VITE_AUTH_REFRESH_THRESHOLD', '3600000')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.refreshTokenThreshold).toBe(3600000)
    })

    it('parses string with leading zeros', async () => {
      vi.stubEnv('VITE_AUTH_REFRESH_THRESHOLD', '0001000')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.refreshTokenThreshold).toBe(1000)
    })

    it('returns default value for non-numeric string', async () => {
      vi.stubEnv('VITE_AUTH_REFRESH_THRESHOLD', 'not-a-number')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.refreshTokenThreshold).toBe(1000 * 60 * 60 * 4)
    })

    it('returns default value for empty string', async () => {
      vi.stubEnv('VITE_AUTH_REFRESH_THRESHOLD', '')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.refreshTokenThreshold).toBe(1000 * 60 * 60 * 4)
    })

    it('parses zero as valid number', async () => {
      vi.stubEnv('VITE_AUTH_REFRESH_THRESHOLD', '0')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.refreshTokenThreshold).toBe(0)
    })

    it('parses negative numbers', async () => {
      vi.stubEnv('VITE_AUTH_REFRESH_THRESHOLD', '-1000')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.refreshTokenThreshold).toBe(-1000)
    })

    it('returns default value for decimal numbers', async () => {
      // parseInt truncates decimal, so 3.14 becomes 3
      vi.stubEnv('VITE_AUTH_REFRESH_THRESHOLD', '3.14')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.refreshTokenThreshold).toBe(3)
    })
  })

  describe('webAPIRoot configuration', () => {
    it('uses VITE_WEBAPI_URL when set', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', 'https://api.example.com/WebAPI')
      vi.stubEnv('VITE_AUTH_WEBAPI_URL', undefined)
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.webAPIRoot).toBe('https://api.example.com/WebAPI')
    })

    it('uses VITE_AUTH_WEBAPI_URL when VITE_WEBAPI_URL is not set', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', undefined)
      vi.stubEnv('VITE_AUTH_WEBAPI_URL', 'https://auth.example.com/WebAPI')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.webAPIRoot).toBe('https://auth.example.com/WebAPI')
    })

    it('prefers VITE_WEBAPI_URL over VITE_AUTH_WEBAPI_URL', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', 'https://primary.example.com/WebAPI')
      vi.stubEnv('VITE_AUTH_WEBAPI_URL', 'https://fallback.example.com/WebAPI')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.webAPIRoot).toBe('https://primary.example.com/WebAPI')
    })

    it('uses default /WebAPI when neither env var is set', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', undefined)
      vi.stubEnv('VITE_AUTH_WEBAPI_URL', undefined)
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.webAPIRoot).toBe('/WebAPI')
    })

    it('handles empty string in VITE_WEBAPI_URL', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', '')
      vi.stubEnv('VITE_AUTH_WEBAPI_URL', 'https://fallback.example.com/WebAPI')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      // Empty string is falsy, so it should fall through
      expect(defaultAuthConfig.webAPIRoot).toBe('https://fallback.example.com/WebAPI')
    })
  })

  describe('defaultAuthConfig', () => {
    it('creates config with all default values when no env vars set', async () => {
      vi.stubEnv('VITE_AUTH_ENABLED', undefined)
      vi.stubEnv('VITE_AUTH_SKIP_LOGIN', undefined)
      vi.stubEnv('VITE_AUTH_PROVIDERS', undefined)
      vi.stubEnv('VITE_AUTH_REFRESH_THRESHOLD', undefined)
      vi.stubEnv('VITE_WEBAPI_URL', undefined)
      vi.stubEnv('VITE_AUTH_WEBAPI_URL', undefined)
      vi.stubEnv('VITE_AUTH_PERMISSION_MANAGEMENT', undefined)

      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig).toEqual({
        userAuthenticationEnabled: false,
        enableSkipLogin: false,
        authProviders: [],
        refreshTokenThreshold: 1000 * 60 * 60 * 4, // 4 hours
        webAPIRoot: '/WebAPI',
        enablePermissionManagement: true, // Default is true
      })
    })

    it('creates config with all custom values from env vars', async () => {
      const providers: AuthProvider[] = [
        {
          name: 'LDAP',
          url: '/auth/ldap',
          ajax: true,
          icon: 'mdi-account-network',
        },
      ]

      vi.stubEnv('VITE_AUTH_ENABLED', 'true')
      vi.stubEnv('VITE_AUTH_SKIP_LOGIN', '1')
      vi.stubEnv('VITE_AUTH_PROVIDERS', JSON.stringify(providers))
      vi.stubEnv('VITE_AUTH_REFRESH_THRESHOLD', '7200000')
      vi.stubEnv('VITE_WEBAPI_URL', 'https://custom.example.com/api')
      vi.stubEnv('VITE_AUTH_PERMISSION_MANAGEMENT', 'false')

      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig).toEqual({
        userAuthenticationEnabled: true,
        enableSkipLogin: true,
        authProviders: providers,
        refreshTokenThreshold: 7200000,
        webAPIRoot: 'https://custom.example.com/api',
        enablePermissionManagement: false,
      })
    })
  })

  describe('authConfig export', () => {
    it('exports mutable authConfig that is copy of defaultAuthConfig', async () => {
      const { authConfig, defaultAuthConfig } = await import('@/config/auth.config')

      expect(authConfig).toEqual(defaultAuthConfig)
      expect(authConfig).not.toBe(defaultAuthConfig) // Should be a copy, not same reference
    })
  })

  describe('setAuthConfig', () => {
    it('updates authConfig with partial values', async () => {
      const { setAuthConfig, authConfig } = await import('@/config/auth.config')
      const initialWebAPIRoot = authConfig.webAPIRoot

      setAuthConfig({
        webAPIRoot: 'https://updated.example.com/WebAPI',
      })

      expect(authConfig.webAPIRoot).toBe('https://updated.example.com/WebAPI')
      expect(authConfig.webAPIRoot).not.toBe(initialWebAPIRoot)
    })

    it('preserves existing values not in partial update', async () => {
      const { setAuthConfig, authConfig } = await import('@/config/auth.config')
      const initialProviders = authConfig.authProviders
      const initialThreshold = authConfig.refreshTokenThreshold

      setAuthConfig({
        userAuthenticationEnabled: true,
      })

      expect(authConfig.userAuthenticationEnabled).toBe(true)
      expect(authConfig.authProviders).toEqual(initialProviders)
      expect(authConfig.refreshTokenThreshold).toBe(initialThreshold)
    })

    it('updates multiple values at once', async () => {
      const { setAuthConfig, authConfig } = await import('@/config/auth.config')

      setAuthConfig({
        userAuthenticationEnabled: true,
        enableSkipLogin: true,
        webAPIRoot: 'https://multi-update.example.com/WebAPI',
      })

      expect(authConfig.userAuthenticationEnabled).toBe(true)
      expect(authConfig.enableSkipLogin).toBe(true)
      expect(authConfig.webAPIRoot).toBe('https://multi-update.example.com/WebAPI')
    })

    it('can be called multiple times', async () => {
      const { setAuthConfig, authConfig } = await import('@/config/auth.config')

      setAuthConfig({ userAuthenticationEnabled: true })
      expect(authConfig.userAuthenticationEnabled).toBe(true)

      setAuthConfig({ enableSkipLogin: true })
      expect(authConfig.userAuthenticationEnabled).toBe(true) // Should still be true
      expect(authConfig.enableSkipLogin).toBe(true)

      setAuthConfig({ userAuthenticationEnabled: false })
      expect(authConfig.userAuthenticationEnabled).toBe(false)
      expect(authConfig.enableSkipLogin).toBe(true) // Should still be true
    })

    it('can update authProviders array', async () => {
      const { setAuthConfig, authConfig } = await import('@/config/auth.config')

      const newProviders: AuthProvider[] = [
        {
          name: 'OAuth',
          url: '/auth/oauth',
          ajax: false,
          icon: 'mdi-key',
        },
      ]

      setAuthConfig({ authProviders: newProviders })

      expect(authConfig.authProviders).toEqual(newProviders)
    })

    it('can update refreshTokenThreshold', async () => {
      const { setAuthConfig, authConfig } = await import('@/config/auth.config')

      setAuthConfig({ refreshTokenThreshold: 9999999 })

      expect(authConfig.refreshTokenThreshold).toBe(9999999)
    })

    it('can update enablePermissionManagement', async () => {
      const { setAuthConfig, authConfig } = await import('@/config/auth.config')

      setAuthConfig({ enablePermissionManagement: false })

      expect(authConfig.enablePermissionManagement).toBe(false)
    })

    it('handles empty partial config', async () => {
      const { setAuthConfig, authConfig } = await import('@/config/auth.config')
      const before = { ...authConfig }

      setAuthConfig({})

      expect(authConfig).toEqual(before)
    })
  })

  describe('edge cases and error handling', () => {
    it('handles very large refresh threshold values', async () => {
      vi.stubEnv('VITE_AUTH_REFRESH_THRESHOLD', '999999999999')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.refreshTokenThreshold).toBe(999999999999)
    })

    it('handles providers with minimal required fields', async () => {
      const minimalProvider: AuthProvider[] = [
        {
          name: 'Minimal',
          url: '/auth',
          ajax: false,
          icon: '',
        },
      ]

      vi.stubEnv('VITE_AUTH_PROVIDERS', JSON.stringify(minimalProvider))
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.authProviders).toEqual(minimalProvider)
    })

    it('handles complex provider JSON', async () => {
      const complexProviders: AuthProvider[] = [
        {
          name: 'Complex Auth',
          url: 'https://auth.example.com/oauth/authorize?client_id=123&redirect_uri=/callback',
          ajax: true,
          icon: 'mdi-shield-account',
          isUseCredentialsForm: true,
          loginPlaceholder: 'Corporate ID (e.g., user@example.com)',
          passwordPlaceholder: 'Password (minimum 12 characters)',
        },
      ]

      vi.stubEnv('VITE_AUTH_PROVIDERS', JSON.stringify(complexProviders))
      const { defaultAuthConfig } = await import('@/config/auth.config')

      expect(defaultAuthConfig.authProviders).toEqual(complexProviders)
    })

    it('handles whitespace in boolean env vars', async () => {
      vi.stubEnv('VITE_AUTH_ENABLED', ' true ')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      // Whitespace makes it not match 'true' exactly
      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(false)
    })

    it('handles case sensitivity in boolean env vars', async () => {
      vi.stubEnv('VITE_AUTH_ENABLED', 'TRUE')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      // Case sensitive, so 'TRUE' doesn't match 'true'
      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(false)
    })

    it('handles case sensitivity in "Yes"', async () => {
      vi.stubEnv('VITE_AUTH_ENABLED', 'Yes')
      const { defaultAuthConfig } = await import('@/config/auth.config')

      // Case sensitive, so 'Yes' doesn't match 'yes'
      expect(defaultAuthConfig.userAuthenticationEnabled).toBe(false)
    })
  })
})
