/**
 * Plugin Routes Tests
 * Tests for plugin route generation and validation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generatePluginRoutes,
  validatePluginRoute
} from '@/plugins/navigation/PluginRoutes'
import { pluginRegistry } from '@/plugins/core/PluginRegistry'

vi.mock('@/plugins/core/PluginRegistry', () => ({
  pluginRegistry: {
    getAllPlugins: vi.fn()
  }
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('PluginRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generatePluginRoutes', () => {
    it('should generate catch-all plugin route', () => {
      const routes = generatePluginRoutes()

      expect(routes).toHaveLength(1)
      expect(routes[0].path).toBe('/plugins/:pluginId/:pathMatch(.*)*')
      expect(routes[0].name).toBe('PluginRoute')
    })

    it('should set requiresAuth meta', () => {
      const routes = generatePluginRoutes()

      expect(routes[0].meta?.requiresAuth).toBe(true)
    })

    it('should set isPluginRoute meta', () => {
      const routes = generatePluginRoutes()

      expect(routes[0].meta?.isPluginRoute).toBe(true)
    })
  })

  describe('validatePluginRoute', () => {
    it('should return true for valid plugin route', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([])

      const result = validatePluginRoute('myPlugin', '/plugins/myPlugin/dashboard')

      expect(result).toBe(true)
    })

    it('should return false if route does not start with plugin prefix', () => {
      const result = validatePluginRoute('myPlugin', '/other/path')

      expect(result).toBe(false)
    })

    it('should return false if route uses different plugin prefix', () => {
      const result = validatePluginRoute('myPlugin', '/plugins/otherPlugin/path')

      expect(result).toBe(false)
    })

    it('should return false if route conflicts with another plugin', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          registration: {
            id: 'existingPlugin',
            menuItems: [
              { route: '/plugins/myPlugin/dashboard' }
            ]
          }
        }
      ] as any)

      const result = validatePluginRoute('myPlugin', '/plugins/myPlugin/dashboard')

      expect(result).toBe(false)
    })

    it('should skip own plugin when checking conflicts', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          registration: {
            id: 'myPlugin',
            menuItems: [
              { route: '/plugins/myPlugin/dashboard' }
            ]
          }
        }
      ] as any)

      const result = validatePluginRoute('myPlugin', '/plugins/myPlugin/dashboard')

      expect(result).toBe(true)
    })
  })
})
