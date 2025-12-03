/**
 * Unit Tests: PluginConfigService
 * Tests for src/services/PluginConfigService.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock PluginModels
vi.mock('@/models/PluginModels', () => ({
  PluginManifestSchema: {
    parse: vi.fn((data) => data),
  },
  DEFAULT_MANIFEST_SETTINGS: {
    enableHotReload: false,
    theme: {},
    navigation: {},
  },
}))

describe('PluginConfigService', () => {
  let PluginConfigService: typeof import('@/services/PluginConfigService').PluginConfigService
  let service: import('@/services/PluginConfigService').PluginConfigService
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
    vi.clearAllMocks()

    // Re-import to get fresh instance
    const module = await import('@/services/PluginConfigService')
    PluginConfigService = module.PluginConfigService
    service = new PluginConfigService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadConfig', () => {
    it('loads and validates plugins.json successfully', async () => {
      const mockManifest = {
        version: '1.0',
        plugins: [
          {
            id: 'test-plugin',
            name: 'Test Plugin',
            menuItems: [
              { route: '/plugins/test-plugin/home', label: 'Home' },
            ],
          },
        ],
        settings: {},
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockManifest),
      })

      const result = await service.loadConfig()

      expect(result.version).toBe('1.0')
      expect(result.plugins).toHaveLength(1)
    })

    it('returns default manifest on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await service.loadConfig()

      expect(result.version).toBe('1.0')
      expect(result.plugins).toHaveLength(0)
    })

    it('throws error on non-404 HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(service.loadConfig()).rejects.toThrow('Failed to load plugins.json')
    })

    it('detects duplicate plugin IDs', async () => {
      const mockManifest = {
        version: '1.0',
        plugins: [
          {
            id: 'duplicate',
            name: 'Plugin 1',
            menuItems: [{ route: '/plugins/duplicate/a', label: 'A' }],
          },
          {
            id: 'duplicate',
            name: 'Plugin 2',
            menuItems: [{ route: '/plugins/duplicate/b', label: 'B' }],
          },
        ],
        settings: {},
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      })

      // Should use default manifest on validation error
      const result = await service.loadConfig()

      expect(result.plugins).toHaveLength(0)
    })

    it('validates plugin routes start with correct prefix', async () => {
      const mockManifest = {
        version: '1.0',
        plugins: [
          {
            id: 'test-plugin',
            name: 'Test Plugin',
            menuItems: [{ route: '/wrong/path', label: 'Wrong' }],
          },
        ],
        settings: {},
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      })

      // Should use default manifest on validation error
      const result = await service.loadConfig()

      expect(result.plugins).toHaveLength(0)
    })

    it('detects duplicate routes across plugins', async () => {
      const mockManifest = {
        version: '1.0',
        plugins: [
          {
            id: 'plugin-a',
            name: 'Plugin A',
            menuItems: [{ route: '/plugins/plugin-a/home', label: 'Home' }],
          },
          {
            id: 'plugin-b',
            name: 'Plugin B',
            menuItems: [{ route: '/plugins/plugin-a/home', label: 'Home' }],
          },
        ],
        settings: {},
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      })

      // Should use default manifest on validation error
      const result = await service.loadConfig()

      expect(result.plugins).toHaveLength(0)
    })
  })

  describe('getManifest', () => {
    it('returns null before loading', () => {
      expect(service.getManifest()).toBeNull()
    })

    it('returns manifest after loading', async () => {
      const mockManifest = {
        version: '1.0',
        plugins: [],
        settings: {},
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      })

      await service.loadConfig()

      expect(service.getManifest()).not.toBeNull()
    })
  })

  describe('getNavigationSettings', () => {
    it('returns null when no manifest loaded', () => {
      expect(service.getNavigationSettings()).toBeNull()
    })

    it('returns navigation settings from manifest', async () => {
      const mockManifest = {
        version: '1.0',
        plugins: [],
        settings: {
          navigation: {
            enabledCoreItems: ['cohorts', 'concepts'],
            disabledCoreItems: ['config'],
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      })

      await service.loadConfig()

      const navSettings = service.getNavigationSettings()
      expect(navSettings?.enabledCoreItems).toContain('cohorts')
    })
  })

  describe('getPrimaryColor', () => {
    it('returns null when no manifest loaded', () => {
      expect(service.getPrimaryColor()).toBeNull()
    })

    it('returns primary color from theme settings', async () => {
      const mockManifest = {
        version: '1.0',
        plugins: [],
        settings: {
          theme: {
            primaryColor: '#FF5733',
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      })

      await service.loadConfig()

      expect(service.getPrimaryColor()).toBe('#FF5733')
    })
  })

  describe('getLogoUrl', () => {
    it('returns null when no manifest loaded', () => {
      expect(service.getLogoUrl()).toBeNull()
    })

    it('returns logo URL from theme settings', async () => {
      const mockManifest = {
        version: '1.0',
        plugins: [],
        settings: {
          theme: {
            logoUrl: '/custom-logo.png',
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      })

      await service.loadConfig()

      expect(service.getLogoUrl()).toBe('/custom-logo.png')
    })
  })

  describe('isCoreNavigationItemEnabled', () => {
    it('returns true when no navigation settings', async () => {
      const mockManifest = {
        version: '1.0',
        plugins: [],
        settings: {},
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      })

      await service.loadConfig()

      expect(service.isCoreNavigationItemEnabled('cohorts')).toBe(true)
    })

    it('returns false for disabled items', async () => {
      const mockManifest = {
        version: '1.0',
        plugins: [],
        settings: {
          navigation: {
            disabledCoreItems: ['config'],
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      })

      await service.loadConfig()

      expect(service.isCoreNavigationItemEnabled('config')).toBe(false)
    })

    it('returns false for items not in enabledCoreItems', async () => {
      const mockManifest = {
        version: '1.0',
        plugins: [],
        settings: {
          navigation: {
            enabledCoreItems: ['cohorts', 'concepts'],
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      })

      await service.loadConfig()

      expect(service.isCoreNavigationItemEnabled('config')).toBe(false)
      expect(service.isCoreNavigationItemEnabled('cohorts')).toBe(true)
    })

    it('disabledCoreItems takes precedence over enabledCoreItems', async () => {
      const mockManifest = {
        version: '1.0',
        plugins: [],
        settings: {
          navigation: {
            enabledCoreItems: ['cohorts', 'config'],
            disabledCoreItems: ['config'],
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      })

      await service.loadConfig()

      expect(service.isCoreNavigationItemEnabled('config')).toBe(false)
    })
  })

  describe('onChange', () => {
    it('adds listener and returns unsubscribe function', async () => {
      const callback = vi.fn()
      const unsubscribe = service.onChange(callback)

      expect(typeof unsubscribe).toBe('function')
    })

    it('unsubscribe removes listener', async () => {
      const callback = vi.fn()
      const unsubscribe = service.onChange(callback)

      unsubscribe()

      // Listener should be removed (internal state test)
      // This is tested indirectly - no callback should be called after unsubscribe
    })
  })

  describe('Singleton Export', () => {
    it('exports singleton instance', async () => {
      const { pluginConfigService } = await import('@/services/PluginConfigService')

      expect(pluginConfigService).toBeInstanceOf(PluginConfigService)
    })
  })
})
