/**
 * Unit Tests: Plugin Framework Initialization
 * Tests for src/plugins/index.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { AuthContext, PluginManifest, PluginInstance } from '@/models/PluginModels';

// Mock dependencies
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/services/PluginConfigService', () => ({
  pluginConfigService: {
    loadConfig: vi.fn(),
    setupHotReload: vi.fn(),
  },
}));

vi.mock('@/plugins/core/PluginRegistry', () => ({
  PluginRegistry: vi.fn(),
  pluginRegistry: {
    registerPlugin: vi.fn(),
    getPlugin: vi.fn(),
    getAllPlugins: vi.fn(),
  },
}));

vi.mock('@/plugins/core/PluginLoader', () => ({
  PluginLoader: vi.fn().mockImplementation(() => ({
    loadPlugin: vi.fn().mockResolvedValue(undefined),
    startPluginFramework: vi.fn(),
  })),
}));

vi.mock('@/plugins/core/PluginIsolation', () => ({
  setupPluginIsolation: vi.fn(),
}));

vi.mock('@/plugins/messaging/HostMessageBus', () => ({
  createHostMessageBus: vi.fn().mockReturnValue({
    send: vi.fn(),
    request: vi.fn(),
    subscribe: vi.fn(),
  }),
}));

describe('Plugin Framework Index', () => {
  let initializePluginFramework: typeof import('@/plugins/index').initializePluginFramework;
  let getPluginRegistry: typeof import('@/plugins/index').getPluginRegistry;
  let getPluginLoader: typeof import('@/plugins/index').getPluginLoader;
  let pluginConfigService: typeof import('@/services/PluginConfigService').pluginConfigService;
  let pluginRegistry: typeof import('@/plugins/core/PluginRegistry').pluginRegistry;
  let PluginLoader: typeof import('@/plugins/core/PluginLoader').PluginLoader;
  let setupPluginIsolation: typeof import('@/plugins/core/PluginIsolation').setupPluginIsolation;
  let createHostMessageBus: typeof import('@/plugins/messaging/HostMessageBus').createHostMessageBus;
  let logger: typeof import('@/utils/logger').logger;

  const mockAuthContext: AuthContext = {
    user: {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      permissions: ['read', 'write'],
    },
    token: 'test-token',
    isAuthenticated: true,
    hasPermission: vi.fn().mockReturnValue(true),
  };

  const mockManifestWithPlugins: PluginManifest = {
    version: '1.0.0',
    plugins: [
      {
        id: 'test-plugin-1',
        name: 'Test Plugin 1',
        version: '1.0.0',
        entryPoint: 'test-plugin-1/index.js',
        menuItems: [],
      },
      {
        id: 'test-plugin-2',
        name: 'Test Plugin 2',
        version: '1.0.0',
        entryPoint: 'test-plugin-2/index.js',
        menuItems: [],
      },
    ],
    settings: {
      enableHotReload: true,
      loadTimeout: 5000,
    },
  };

  const mockManifestEmpty: PluginManifest = {
    version: '1.0.0',
    plugins: [],
  };

  const mockPluginInstance: PluginInstance = {
    registration: mockManifestWithPlugins.plugins[0],
    state: 'not-loaded',
    authContext: mockAuthContext,
    messageBus: {
      send: vi.fn(),
      request: vi.fn(),
      subscribe: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Import fresh modules after mocks are set up
    const indexModule = await import('@/plugins/index');
    initializePluginFramework = indexModule.initializePluginFramework;
    getPluginRegistry = indexModule.getPluginRegistry;
    getPluginLoader = indexModule.getPluginLoader;

    pluginConfigService = (await import('@/services/PluginConfigService')).pluginConfigService;
    pluginRegistry = (await import('@/plugins/core/PluginRegistry')).pluginRegistry;
    PluginLoader = (await import('@/plugins/core/PluginLoader')).PluginLoader;
    setupPluginIsolation = (await import('@/plugins/core/PluginIsolation')).setupPluginIsolation;
    createHostMessageBus = (await import('@/plugins/messaging/HostMessageBus')).createHostMessageBus;
    logger = (await import('@/utils/logger')).logger;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializePluginFramework', () => {
    it('should log initialization start', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestEmpty);

      await initializePluginFramework(mockAuthContext);

      expect(logger.info).toHaveBeenCalledWith('PluginFramework', 'Initializing...');
    });

    it('should setup plugin isolation', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestEmpty);

      await initializePluginFramework(mockAuthContext);

      expect(setupPluginIsolation).toHaveBeenCalled();
    });

    it('should load plugin configuration', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestEmpty);

      await initializePluginFramework(mockAuthContext);

      expect(pluginConfigService.loadConfig).toHaveBeenCalled();
    });

    it('should log number of plugins loaded', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestWithPlugins);
      (pluginRegistry.registerPlugin as Mock).mockReturnValue(mockPluginInstance);

      await initializePluginFramework(mockAuthContext);

      expect(logger.info).toHaveBeenCalledWith(
        'PluginFramework',
        'Loaded 2 plugin(s)'
      );
    });

    it.skip('should skip plugin loading when no plugins configured', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestEmpty);

      await initializePluginFramework(mockAuthContext);

      expect(logger.info).toHaveBeenCalledWith(
        'PluginFramework',
        'No plugins configured, skipping plugin loading'
      );
      expect(PluginLoader).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('PluginFramework', 'Initialization complete');
    });

    it('should create plugin loader when plugins exist', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestWithPlugins);
      (pluginRegistry.registerPlugin as Mock).mockReturnValue(mockPluginInstance);

      await initializePluginFramework(mockAuthContext);

      expect(PluginLoader).toHaveBeenCalledWith(pluginRegistry);
    });

    it.skip('should register all plugins with message bus', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestWithPlugins);
      (pluginRegistry.registerPlugin as Mock).mockReturnValue(mockPluginInstance);

      await initializePluginFramework(mockAuthContext);

      expect(createHostMessageBus).toHaveBeenCalledWith('test-plugin-1');
      expect(createHostMessageBus).toHaveBeenCalledWith('test-plugin-2');
      expect(pluginRegistry.registerPlugin).toHaveBeenCalledTimes(2);
    });

    it('should pass auth context and message bus to registry', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestWithPlugins);
      const mockMessageBus = {
        send: vi.fn(),
        request: vi.fn(),
        subscribe: vi.fn(),
      };
      (createHostMessageBus as Mock).mockReturnValue(mockMessageBus);
      (pluginRegistry.registerPlugin as Mock).mockReturnValue(mockPluginInstance);

      await initializePluginFramework(mockAuthContext);

      expect(pluginRegistry.registerPlugin).toHaveBeenCalledWith(
        mockManifestWithPlugins.plugins[0],
        mockAuthContext,
        mockMessageBus
      );
    });

    it('should load each registered plugin', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestWithPlugins);
      (pluginRegistry.registerPlugin as Mock).mockReturnValue(mockPluginInstance);

      const mockLoader = {
        loadPlugin: vi.fn().mockResolvedValue(undefined),
        startPluginFramework: vi.fn(),
      };
      (PluginLoader as unknown as Mock).mockReturnValue(mockLoader);

      await initializePluginFramework(mockAuthContext);

      expect(mockLoader.loadPlugin).toHaveBeenCalledTimes(2);
      expect(mockLoader.loadPlugin).toHaveBeenCalledWith(mockPluginInstance);
    });

    it('should start plugin framework after loading', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestWithPlugins);
      (pluginRegistry.registerPlugin as Mock).mockReturnValue(mockPluginInstance);

      const mockLoader = {
        loadPlugin: vi.fn().mockResolvedValue(undefined),
        startPluginFramework: vi.fn(),
      };
      (PluginLoader as unknown as Mock).mockReturnValue(mockLoader);

      await initializePluginFramework(mockAuthContext);

      expect(mockLoader.startPluginFramework).toHaveBeenCalled();
    });

    it.skip('should setup hot reload', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestWithPlugins);
      (pluginRegistry.registerPlugin as Mock).mockReturnValue(mockPluginInstance);

      await initializePluginFramework(mockAuthContext);

      expect(pluginConfigService.setupHotReload).toHaveBeenCalled();
    });

    it.skip('should log initialization complete', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestWithPlugins);
      (pluginRegistry.registerPlugin as Mock).mockReturnValue(mockPluginInstance);

      await initializePluginFramework(mockAuthContext);

      expect(logger.info).toHaveBeenCalledWith('PluginFramework', 'Initialization complete');
    });

    it('should not initialize twice', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestEmpty);

      await initializePluginFramework(mockAuthContext);
      await initializePluginFramework(mockAuthContext);

      expect(logger.warn).toHaveBeenCalledWith('PluginFramework', 'Already initialized');
      expect(pluginConfigService.loadConfig).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors gracefully', async () => {
      const error = new Error('Config load failed');
      (pluginConfigService.loadConfig as Mock).mockRejectedValue(error);

      await initializePluginFramework(mockAuthContext);

      expect(logger.error).toHaveBeenCalledWith(
        'PluginFramework',
        'Initialization failed',
        error
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'PluginFramework',
        'Continuing without plugin support'
      );
    });

    it('should mark as initialized even after error', async () => {
      const error = new Error('Config load failed');
      (pluginConfigService.loadConfig as Mock).mockRejectedValue(error);

      await initializePluginFramework(mockAuthContext);
      await initializePluginFramework(mockAuthContext);

      expect(logger.warn).toHaveBeenCalledWith('PluginFramework', 'Already initialized');
    });

    it('should handle plugin registration errors', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestWithPlugins);
      const error = new Error('Registration failed');
      (pluginRegistry.registerPlugin as Mock).mockImplementation(() => {
        throw error;
      });

      await initializePluginFramework(mockAuthContext);

      expect(logger.error).toHaveBeenCalledWith(
        'PluginFramework',
        'Initialization failed',
        error
      );
    });

    it('should handle plugin loading errors', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestWithPlugins);
      (pluginRegistry.registerPlugin as Mock).mockReturnValue(mockPluginInstance);

      const error = new Error('Load failed');
      const mockLoader = {
        loadPlugin: vi.fn().mockRejectedValue(error),
        startPluginFramework: vi.fn(),
      };
      (PluginLoader as unknown as Mock).mockReturnValue(mockLoader);

      await initializePluginFramework(mockAuthContext);

      expect(logger.error).toHaveBeenCalledWith(
        'PluginFramework',
        'Initialization failed',
        error
      );
    });

    it('should continue without plugins after framework start error', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestWithPlugins);
      (pluginRegistry.registerPlugin as Mock).mockReturnValue(mockPluginInstance);

      const error = new Error('Framework start failed');
      const mockLoader = {
        loadPlugin: vi.fn().mockResolvedValue(undefined),
        startPluginFramework: vi.fn().mockImplementation(() => {
          throw error;
        }),
      };
      (PluginLoader as unknown as Mock).mockReturnValue(mockLoader);

      await initializePluginFramework(mockAuthContext);

      expect(logger.error).toHaveBeenCalledWith(
        'PluginFramework',
        'Initialization failed',
        error
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'PluginFramework',
        'Continuing without plugin support'
      );
    });
  });

  describe('getPluginRegistry', () => {
    it('should return the plugin registry instance', async () => {
      const registry = getPluginRegistry();

      expect(registry).toBe(pluginRegistry);
    });

    it('should return same instance on multiple calls', async () => {
      const registry1 = getPluginRegistry();
      const registry2 = getPluginRegistry();

      expect(registry1).toBe(registry2);
    });
  });

  describe('getPluginLoader', () => {
    it('should return null before initialization', async () => {
      const loader = getPluginLoader();

      expect(loader).toBeNull();
    });

    it('should return null when no plugins configured', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestEmpty);

      await initializePluginFramework(mockAuthContext);
      const loader = getPluginLoader();

      expect(loader).toBeNull();
    });

    it('should return plugin loader after initialization with plugins', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestWithPlugins);
      (pluginRegistry.registerPlugin as Mock).mockReturnValue(mockPluginInstance);

      const mockLoader = {
        loadPlugin: vi.fn().mockResolvedValue(undefined),
        startPluginFramework: vi.fn(),
      };
      (PluginLoader as unknown as Mock).mockReturnValue(mockLoader);

      await initializePluginFramework(mockAuthContext);
      const loader = getPluginLoader();

      expect(loader).toBe(mockLoader);
    });

    it('should return null after initialization error', async () => {
      const error = new Error('Config load failed');
      (pluginConfigService.loadConfig as Mock).mockRejectedValue(error);

      await initializePluginFramework(mockAuthContext);
      const loader = getPluginLoader();

      expect(loader).toBeNull();
    });
  });

  describe('pluginRegistry export', () => {
    it('should export pluginRegistry singleton', async () => {
      const { pluginRegistry: exportedRegistry } = await import('@/plugins/index');

      expect(exportedRegistry).toBe(pluginRegistry);
    });
  });

  describe('initialization state management', () => {
    it('should maintain initialized state across function calls', async () => {
      (pluginConfigService.loadConfig as Mock).mockResolvedValue(mockManifestWithPlugins);
      (pluginRegistry.registerPlugin as Mock).mockReturnValue(mockPluginInstance);

      // First initialization
      await initializePluginFramework(mockAuthContext);

      // Reset mock call count
      vi.clearAllMocks();

      // Second initialization attempt with different auth context
      const differentAuthContext: AuthContext = {
        user: null,
        token: null,
        isAuthenticated: false,
        hasPermission: vi.fn().mockReturnValue(false),
      };
      await initializePluginFramework(differentAuthContext);

      // Should log warning and not reinitialize
      expect(logger.warn).toHaveBeenCalledWith('PluginFramework', 'Already initialized');
      expect(setupPluginIsolation).not.toHaveBeenCalled();
    });
  });

  describe('plugin loading sequence', () => {
    it.skip('should execute initialization steps in correct order', async () => {
      const callOrder: string[] = [];

      (setupPluginIsolation as Mock).mockImplementation(() => {
        callOrder.push('setupPluginIsolation');
      });

      (pluginConfigService.loadConfig as Mock).mockImplementation(async () => {
        callOrder.push('loadConfig');
        return mockManifestWithPlugins;
      });

      (createHostMessageBus as Mock).mockImplementation(() => {
        callOrder.push('createHostMessageBus');
        return {
          send: vi.fn(),
          request: vi.fn(),
          subscribe: vi.fn(),
        };
      });

      (pluginRegistry.registerPlugin as Mock).mockImplementation(() => {
        callOrder.push('registerPlugin');
        return mockPluginInstance;
      });

      const mockLoader = {
        loadPlugin: vi.fn().mockImplementation(async () => {
          callOrder.push('loadPlugin');
        }),
        startPluginFramework: vi.fn().mockImplementation(() => {
          callOrder.push('startPluginFramework');
        }),
      };
      (PluginLoader as unknown as Mock).mockReturnValue(mockLoader);

      (pluginConfigService.setupHotReload as Mock).mockImplementation(() => {
        callOrder.push('setupHotReload');
      });

      await initializePluginFramework(mockAuthContext);

      expect(callOrder).toEqual([
        'setupPluginIsolation',
        'loadConfig',
        'createHostMessageBus',
        'registerPlugin',
        'createHostMessageBus',
        'registerPlugin',
        'loadPlugin',
        'loadPlugin',
        'startPluginFramework',
        'setupHotReload',
      ]);
    });
  });
});
