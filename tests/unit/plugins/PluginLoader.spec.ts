import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginLoader } from '@/plugins/core/PluginLoader';
import { PluginRegistry } from '@/plugins/core/PluginRegistry';
import { PluginInstance } from '@/models/PluginModels';

// Mock single-spa
vi.mock('single-spa', () => ({
  registerApplication: vi.fn(),
  start: vi.fn(),
}));

describe('PluginLoader', () => {
  let loader: PluginLoader;
  let registry: PluginRegistry;
  let mockSystemImport: any;

  const mockPlugin: PluginInstance = {
    registration: {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      entryPoint: 'test-plugin/index.js',
      menuItems: [],
    },
    state: 'not-loaded',
    authContext: {
      user: null,
      token: null,
      isAuthenticated: false,
      hasPermission: () => false,
    },
    messageBus: {
      send: vi.fn(),
      request: vi.fn(),
      subscribe: vi.fn(),
    },
  };

  beforeEach(() => {
    registry = new PluginRegistry();
    loader = new PluginLoader(registry);
    
    // Mock System.import as a spy
    mockSystemImport = vi.fn().mockResolvedValue({
      bootstrap: vi.fn(),
      mount: vi.fn(),
      unmount: vi.fn(),
    });
    
    (window as any).System = {
      import: mockSystemImport,
    };
  });

  describe('loadPlugin', () => {
    it('should update plugin state to loading', async () => {
      const updateStateSpy = vi.spyOn(registry, 'updatePluginState');
      
      await loader.loadPlugin(mockPlugin);
      
      expect(updateStateSpy).toHaveBeenCalledWith('test-plugin', 'loading');
    });

    it.skip('should call System.import with correct URL', async () => {
      await loader.loadPlugin(mockPlugin);
      
      expect(mockSystemImport).toHaveBeenCalledWith(
        '/plugins/test-plugin/index.js'
      );
    });

    it.skip('should track load time metrics', async () => {
      const updateMetricsSpy = vi.spyOn(registry, 'updatePluginMetrics');
      
      await loader.loadPlugin(mockPlugin);
      
      expect(updateMetricsSpy).toHaveBeenCalledWith(
        'test-plugin',
        expect.objectContaining({
          loadTime: expect.any(Number),
        })
      );
    });
  });

  describe('startPluginFramework', () => {
    it.skip('should call single-spa start', () => {
      const { start } = require('single-spa');
      
      loader.startPluginFramework();
      
      expect(start).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it.skip('should handle plugin load failures', async () => {
      (window as any).System.import = vi.fn().mockRejectedValue(new Error('Load failed'));
      
      const setErrorSpy = vi.spyOn(registry, 'setPluginError');
      
      await loader.loadPlugin(mockPlugin);
      
      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(setErrorSpy).toHaveBeenCalled();
    });
  });

  describe('retryPlugin', () => {
    it('should clear error and reload plugin', async () => {
      registry.registerPlugin(
        mockPlugin.registration,
        mockPlugin.authContext,
        mockPlugin.messageBus
      );
      
      registry.setPluginError('test-plugin', new Error('Test'), true);
      
      await loader.retryPlugin('test-plugin');
      
      const plugin = registry.getPlugin('test-plugin');
      expect(plugin?.error).toBeUndefined();
    });

    it('should throw error for non-existent plugin', async () => {
      await expect(loader.retryPlugin('non-existent')).rejects.toThrow('not found');
    });
  });
});
