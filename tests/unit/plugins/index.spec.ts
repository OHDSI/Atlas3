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

vi.mock('@/plugins/core/PluginDiagnostics', () => ({
  setupPluginDiagnostics: vi.fn()
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

    it('should register every plugin before loading any of them', async () => {
      const { pluginConfigService } = await import('@/services/PluginConfigService')
      const { pluginRegistry } = await import('@/plugins/core/PluginRegistry')
      const { PluginLoader } = await import('@/plugins/core/PluginLoader')

      vi.mocked(pluginConfigService.loadConfig).mockResolvedValue({
        plugins: [
          { id: 'plugin1', name: 'Plugin 1', entryUrl: '/plugin1.js', menuItems: [] },
          { id: 'plugin2', name: 'Plugin 2', entryUrl: '/plugin2.js', menuItems: [] }
        ]
      } as any)

      const order: string[] = []
      vi.mocked(pluginRegistry.registerPlugin).mockImplementation(registration => {
        order.push(`register:${registration.id}`)
        return { registration, state: 'not-loaded' } as any
      })
      vi.mocked(PluginLoader).mockImplementation(
        () =>
          ({
            loadPlugin: vi.fn(async (instance: any) => {
              order.push(`load:${instance.registration.id}`)
            }),
            startPluginFramework: vi.fn()
          }) as any
      )

      const { initializePluginFramework } = await import('@/plugins/index')
      await initializePluginFramework({ token: 'test' } as any)

      expect(order).toEqual([
        'register:plugin1',
        'register:plugin2',
        'load:plugin1',
        'load:plugin2'
      ])
    })

    it('should resolve whenPluginFrameworkReady once plugins are registered, before loading finishes', async () => {
      const { pluginConfigService } = await import('@/services/PluginConfigService')
      const { pluginRegistry } = await import('@/plugins/core/PluginRegistry')
      const { PluginLoader } = await import('@/plugins/core/PluginLoader')

      vi.mocked(pluginConfigService.loadConfig).mockResolvedValue({
        plugins: [{ id: 'plugin1', name: 'Plugin 1', entryUrl: '/plugin1.js', menuItems: [] }]
      } as any)
      vi.mocked(pluginRegistry.registerPlugin).mockImplementation(
        registration => ({ registration, state: 'not-loaded' }) as any
      )
      let finishLoad!: () => void
      vi.mocked(PluginLoader).mockImplementation(
        () =>
          ({
            loadPlugin: vi.fn(() => new Promise<void>(resolve => (finishLoad = resolve))),
            startPluginFramework: vi.fn()
          }) as any
      )

      const { initializePluginFramework, whenPluginFrameworkReady } = await import('@/plugins/index')
      const init = initializePluginFramework({ token: 'test' } as any)

      await whenPluginFrameworkReady()
      expect(pluginRegistry.registerPlugin).toHaveBeenCalledTimes(1)

      finishLoad()
      await init
    })

    it('should resolve whenPluginFrameworkReady when initialization fails', async () => {
      const { pluginConfigService } = await import('@/services/PluginConfigService')
      vi.mocked(pluginConfigService.loadConfig).mockRejectedValue(new Error('boom'))

      const { initializePluginFramework, whenPluginFrameworkReady } = await import('@/plugins/index')
      await initializePluginFramework({ token: 'test' } as any)

      await expect(whenPluginFrameworkReady()).resolves.toBeUndefined()
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
