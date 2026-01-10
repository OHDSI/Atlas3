/**
 * Plugin Framework Index Tests
 * Tests for plugin framework initialization
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies before importing
vi.mock('@/services/PluginConfigService', () => ({
  pluginConfigService: {
    loadConfig: vi.fn(),
    setupHotReload: vi.fn()
  }
}))

vi.mock('@/plugins/core/PluginRegistry', () => {
  const mockRegistry = {
    registerPlugin: vi.fn(),
    getAllPlugins: vi.fn(() => [])
  }
  return {
    PluginRegistry: vi.fn(() => mockRegistry),
    pluginRegistry: mockRegistry
  }
})

vi.mock('@/plugins/core/PluginLoader', () => ({
  PluginLoader: vi.fn().mockImplementation(() => ({
    loadPlugin: vi.fn().mockResolvedValue(undefined),
    startPluginFramework: vi.fn()
  }))
}))

vi.mock('@/plugins/core/PluginIsolation', () => ({
  setupPluginIsolation: vi.fn()
}))

vi.mock('@/plugins/messaging/HostMessageBus', () => ({
  createHostMessageBus: vi.fn(() => ({
    send: vi.fn(),
    subscribe: vi.fn()
  }))
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('Plugin Framework Index', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('initializePluginFramework', () => {
    it('should initialize plugin framework successfully', async () => {
      const { pluginConfigService } = await import('@/services/PluginConfigService')
      vi.mocked(pluginConfigService.loadConfig).mockResolvedValue({
        plugins: []
      })

      const { initializePluginFramework } = await import('@/plugins/index')
      await initializePluginFramework({ token: 'test' })

      expect(pluginConfigService.loadConfig).toHaveBeenCalled()
    })

    it('should skip plugin loading when no plugins configured', async () => {
      const { pluginConfigService } = await import('@/services/PluginConfigService')
      vi.mocked(pluginConfigService.loadConfig).mockResolvedValue({
        plugins: []
      })

      const { initializePluginFramework } = await import('@/plugins/index')
      const { logger } = await import('@/utils/logger')

      await initializePluginFramework({ token: 'test' })

      expect(logger.info).toHaveBeenCalledWith(
        'PluginFramework',
        'No plugins configured, skipping plugin loading'
      )
    })

    it('should load and register plugins when configured', async () => {
      const { pluginConfigService } = await import('@/services/PluginConfigService')
      const { pluginRegistry } = await import('@/plugins/core/PluginRegistry')

      vi.mocked(pluginConfigService.loadConfig).mockResolvedValue({
        plugins: [
          { id: 'plugin1', name: 'Plugin 1', entryUrl: '/plugin1.js', menuItems: [] }
        ]
      })
      vi.mocked(pluginRegistry.registerPlugin).mockReturnValue({
        registration: { id: 'plugin1' },
        state: 'registered'
      } as any)

      const { initializePluginFramework } = await import('@/plugins/index')
      await initializePluginFramework({ token: 'test' })

      expect(pluginRegistry.registerPlugin).toHaveBeenCalled()
    })

    it('should handle initialization errors gracefully', async () => {
      const { pluginConfigService } = await import('@/services/PluginConfigService')
      vi.mocked(pluginConfigService.loadConfig).mockRejectedValue(
        new Error('Config load failed')
      )

      const { initializePluginFramework } = await import('@/plugins/index')
      const { logger } = await import('@/utils/logger')

      // Should not throw
      await initializePluginFramework({ token: 'test' })

      expect(logger.error).toHaveBeenCalledWith(
        'PluginFramework',
        'Initialization failed',
        expect.any(Error)
      )
    })
  })

  describe('getPluginRegistry', () => {
    it('should return plugin registry', async () => {
      const { getPluginRegistry, pluginRegistry } = await import('@/plugins/index')

      const result = getPluginRegistry()

      expect(result).toBe(pluginRegistry)
    })
  })

  describe('getPluginLoader', () => {
    it('should return null before initialization', async () => {
      const { getPluginLoader } = await import('@/plugins/index')

      const result = getPluginLoader()

      expect(result).toBeNull()
    })
  })
})
