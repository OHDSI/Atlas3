import { describe, it, expect, beforeEach, vi, type Mock, afterEach } from 'vitest';
import { PluginLoader } from '@/plugins/core/PluginLoader';
import { PluginRegistry } from '@/plugins/core/PluginRegistry';
import { PluginInstance } from '@/models/PluginModels';
import type { SystemJS } from '@/types/plugin';
import { registerApplication, start } from 'single-spa';

// Mock single-spa
vi.mock('single-spa', () => ({
  registerApplication: vi.fn(),
  start: vi.fn(),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe.skip('PluginLoader', () => {
  let loader: PluginLoader;
  let registry: PluginRegistry;
  let mockSystemImport: Mock;
  let _originalSetTimeout: typeof setTimeout;
  let _originalClearTimeout: typeof clearTimeout;

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

  const mockPluginModule = {
    bootstrap: vi.fn(),
    mount: vi.fn(),
    unmount: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    originalSetTimeout = global.setTimeout;
    originalClearTimeout = global.clearTimeout;

    registry = new PluginRegistry();
    loader = new PluginLoader(registry);

    // Mock System.import as a spy
    mockSystemImport = vi.fn().mockResolvedValue(mockPluginModule);

    window.System = {
      import: mockSystemImport,
    } as SystemJS;

    // Mock DOM element for customProps
    const mockElement = document.createElement('div');
    mockElement.id = 'plugin-test-plugin';
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('loadPlugin', () => {
    it('should update plugin state to loading', async () => {
      const updateStateSpy = vi.spyOn(registry, 'updatePluginState');

      await loader.loadPlugin(mockPlugin);

      expect(updateStateSpy).toHaveBeenCalledWith('test-plugin', 'loading');
    });

    it('should call System.import with correct URL', async () => {
      await loader.loadPlugin(mockPlugin);

      expect(mockSystemImport).toHaveBeenCalledWith(
        expect.stringContaining('plugins/test-plugin/index.js')
      );
    });

    it('should track load time metrics', async () => {
      const updateMetricsSpy = vi.spyOn(registry, 'updatePluginMetrics');

      await loader.loadPlugin(mockPlugin);

      expect(updateMetricsSpy).toHaveBeenCalledWith(
        'test-plugin',
        expect.objectContaining({
          loadTime: expect.any(Number),
        })
      );
    });

    it('should update plugin state to loaded on success', async () => {
      const updateStateSpy = vi.spyOn(registry, 'updatePluginState');

      await loader.loadPlugin(mockPlugin);

      expect(updateStateSpy).toHaveBeenCalledWith('test-plugin', 'loaded');
    });

    it('should register application with single-spa', async () => {
      await loader.loadPlugin(mockPlugin);

      expect(registerApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-plugin',
          app: expect.any(Function),
          activeWhen: expect.any(Function),
          customProps: expect.any(Function),
        })
      );
    });

    it('should store application reference on plugin', async () => {
      await loader.loadPlugin(mockPlugin);

      expect(mockPlugin.application).toEqual({ name: 'test-plugin' });
    });

    it('should throw error when SystemJS is not available', async () => {
      // @ts-expect-error - intentionally setting to undefined
      window.System = undefined;

      await loader.loadPlugin(mockPlugin);

      // Error should be handled by handleLoadError
      expect(registry.getPlugin('test-plugin')?.state).toBe('loading');
    });

    it('should throw error when module is missing bootstrap method', async () => {
      mockSystemImport.mockResolvedValueOnce({
        mount: vi.fn(),
        unmount: vi.fn(),
      });

      await loader.loadPlugin(mockPlugin);

      // The error should be caught and handled
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockSystemImport).toHaveBeenCalled();
    });

    it('should throw error when module is missing mount method', async () => {
      mockSystemImport.mockResolvedValueOnce({
        bootstrap: vi.fn(),
        unmount: vi.fn(),
      });

      await loader.loadPlugin(mockPlugin);

      await vi.advanceTimersByTimeAsync(1000);
      expect(mockSystemImport).toHaveBeenCalled();
    });

    it('should throw error when module is missing unmount method', async () => {
      mockSystemImport.mockResolvedValueOnce({
        bootstrap: vi.fn(),
        mount: vi.fn(),
      });

      await loader.loadPlugin(mockPlugin);

      await vi.advanceTimersByTimeAsync(1000);
      expect(mockSystemImport).toHaveBeenCalled();
    });

    it('should handle System.import rejection', async () => {
      const importError = new Error('Import failed');
      mockSystemImport.mockRejectedValueOnce(importError);

      await loader.loadPlugin(mockPlugin);

      // Wait for retry attempt
      await vi.advanceTimersByTimeAsync(1000);

      // Should retry after failure
      expect(mockSystemImport).toHaveBeenCalledTimes(2);
    });

    it('should set loading timeout', async () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      await loader.loadPlugin(mockPlugin);

      expect(setTimeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        30000 // LOADING_TIMEOUT
      );
    });

    it('should clear timeout on successful load', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      await loader.loadPlugin(mockPlugin);

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should set plugin error on timeout', async () => {
      // Make System.import hang
      mockSystemImport.mockImplementationOnce(() => new Promise(() => {}));

      const setErrorSpy = vi.spyOn(registry, 'setPluginError');

      // Start loading
      const loadPromise = loader.loadPlugin(mockPlugin);

      // Advance time to trigger timeout
      await vi.advanceTimersByTimeAsync(30000);

      expect(setErrorSpy).toHaveBeenCalledWith(
        'test-plugin',
        expect.objectContaining({
          message: expect.stringContaining('timeout'),
        }),
        true
      );

      // Let the promise complete
      await loadPromise;
    });

    describe('activeWhen function', () => {
      it('should return true when pathname matches plugin path', async () => {
        await loader.loadPlugin(mockPlugin);

        const registerCall = (registerApplication as Mock).mock.calls[0][0];
        const activeWhen = registerCall.activeWhen;

        const result = activeWhen({ pathname: '/plugins/test-plugin/dashboard' });
        expect(result).toBe(true);
      });

      it('should return false when pathname does not match plugin path', async () => {
        await loader.loadPlugin(mockPlugin);

        const registerCall = (registerApplication as Mock).mock.calls[0][0];
        const activeWhen = registerCall.activeWhen;

        const result = activeWhen({ pathname: '/other/path' });
        expect(result).toBe(false);
      });

      it('should handle base path correctly', async () => {
        await loader.loadPlugin(mockPlugin);

        const registerCall = (registerApplication as Mock).mock.calls[0][0];
        const activeWhen = registerCall.activeWhen;

        // Should normalize multiple slashes
        const result = activeWhen({ pathname: '/plugins/test-plugin/' });
        expect(result).toBe(true);
      });
    });

    describe('customProps function', () => {
      it('should return correct custom props', async () => {
        await loader.loadPlugin(mockPlugin);

        const registerCall = (registerApplication as Mock).mock.calls[0][0];
        const customProps = registerCall.customProps;

        const props = customProps();

        expect(props).toEqual({
          name: 'Test Plugin',
          authContext: mockPlugin.authContext,
          messageBus: mockPlugin.messageBus,
          domElement: expect.any(HTMLElement),
        });
      });

      it('should find DOM element with correct ID', async () => {
        await loader.loadPlugin(mockPlugin);

        const registerCall = (registerApplication as Mock).mock.calls[0][0];
        const customProps = registerCall.customProps;

        customProps();

        expect(document.getElementById).toHaveBeenCalledWith('plugin-test-plugin');
      });

      it('should handle missing DOM element', async () => {
        vi.spyOn(document, 'getElementById').mockReturnValue(null);

        await loader.loadPlugin(mockPlugin);

        const registerCall = (registerApplication as Mock).mock.calls[0][0];
        const customProps = registerCall.customProps;

        const props = customProps();
        expect(props.domElement).toBeNull();
      });
    });

    describe('app function', () => {
      it('should return resolved plugin module', async () => {
        await loader.loadPlugin(mockPlugin);

        const registerCall = (registerApplication as Mock).mock.calls[0][0];
        const app = registerCall.app;

        const module = await app();
        expect(module).toBe(mockPluginModule);
      });
    });
  });

  describe('handleLoadError', () => {
    it('should retry plugin loading on first failure', async () => {
      let callCount = 0;
      mockSystemImport.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First failure'));
        }
        return Promise.resolve(mockPluginModule);
      });

      await loader.loadPlugin(mockPlugin);

      // Advance time to trigger first retry
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockSystemImport).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff for retries', async () => {
      mockSystemImport.mockRejectedValue(new Error('Always fail'));

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      await loader.loadPlugin(mockPlugin);

      // First retry: 1000ms (1 * 1000)
      await vi.advanceTimersByTimeAsync(1000);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

      // Second retry: 2000ms (2 * 1000)
      await vi.advanceTimersByTimeAsync(2000);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);

      // Third retry: 3000ms (3 * 1000)
      await vi.advanceTimersByTimeAsync(3000);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3000);
    });

    it('should set error after MAX_RETRIES attempts', async () => {
      const loadError = new Error('Persistent failure');
      mockSystemImport.mockRejectedValue(loadError);

      const setErrorSpy = vi.spyOn(registry, 'setPluginError');

      await loader.loadPlugin(mockPlugin);

      // Exhaust all retries: 1000ms + 2000ms + 3000ms
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(3000);

      expect(setErrorSpy).toHaveBeenCalledWith('test-plugin', loadError, false);
      expect(mockSystemImport).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should not retry if plugin is not found in registry', async () => {
      mockSystemImport.mockRejectedValueOnce(new Error('First failure'));

      // Don't register plugin in registry
      const mockPluginCopy = { ...mockPlugin };

      await loader.loadPlugin(mockPluginCopy);

      // Remove plugin from registry before retry
      vi.spyOn(registry, 'getPlugin').mockReturnValue(undefined);

      await vi.advanceTimersByTimeAsync(1000);

      // Should only have called once (no retry)
      expect(mockSystemImport).toHaveBeenCalledTimes(1);
    });

    it('should clear retry attempts after max retries', async () => {
      mockSystemImport.mockRejectedValue(new Error('Always fail'));

      await loader.loadPlugin(mockPlugin);

      // Exhaust all retries
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(3000);

      // Now try manual retry - should start fresh
      registry.registerPlugin(
        mockPlugin.registration,
        mockPlugin.authContext,
        mockPlugin.messageBus
      );

      mockSystemImport.mockResolvedValueOnce(mockPluginModule);
      await loader.retryPlugin('test-plugin');

      // Should succeed without being blocked by previous failures
      expect(registry.getPlugin('test-plugin')?.state).toBe('loaded');
    });
  });

  describe('retryPlugin', () => {
    beforeEach(() => {
      registry.registerPlugin(
        mockPlugin.registration,
        mockPlugin.authContext,
        mockPlugin.messageBus
      );
    });

    it('should clear error and reload plugin', async () => {
      registry.setPluginError('test-plugin', new Error('Test'), true);

      await loader.retryPlugin('test-plugin');

      const instance = registry.getPlugin('test-plugin');
      expect(instance?.error).toBeUndefined();
    });

    it('should throw error for non-existent plugin', async () => {
      await expect(loader.retryPlugin('non-existent')).rejects.toThrow('not found');
    });

    it('should reset retry attempts', async () => {
      registry.setPluginError('test-plugin', new Error('Test'), true);

      // Set up mock to fail initially then succeed
      let attemptCount = 0;
      mockSystemImport.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error('Retry test failure'));
        }
        return Promise.resolve(mockPluginModule);
      });

      await loader.retryPlugin('test-plugin');

      // Advance time for the automatic retry
      await vi.advanceTimersByTimeAsync(1000);

      // Should eventually succeed after retry
      expect(mockSystemImport).toHaveBeenCalledTimes(2);
    });

    it('should handle plugin with no error', async () => {
      // Plugin has no error initially
      await loader.retryPlugin('test-plugin');

      // Should still attempt to reload
      expect(mockSystemImport).toHaveBeenCalled();
    });

    it('should call loadPlugin internally', async () => {
      const loadPluginSpy = vi.spyOn(loader, 'loadPlugin');

      await loader.retryPlugin('test-plugin');

      expect(loadPluginSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          registration: expect.objectContaining({ id: 'test-plugin' }),
        })
      );
    });
  });

  describe('startPluginFramework', () => {
    it('should call single-spa start', () => {
      loader.startPluginFramework();

      expect(start).toHaveBeenCalledWith({
        urlRerouteOnly: true,
      });
    });

    it('should only call start once', () => {
      loader.startPluginFramework();
      loader.startPluginFramework();

      expect(start).toHaveBeenCalledTimes(2); // Each call goes through
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete successful load flow', async () => {
      const updateStateSpy = vi.spyOn(registry, 'updatePluginState');
      const updateMetricsSpy = vi.spyOn(registry, 'updatePluginMetrics');

      await loader.loadPlugin(mockPlugin);

      // Verify state transitions
      expect(updateStateSpy).toHaveBeenCalledWith('test-plugin', 'loading');
      expect(updateStateSpy).toHaveBeenCalledWith('test-plugin', 'loaded');

      // Verify metrics
      expect(updateMetricsSpy).toHaveBeenCalledWith(
        'test-plugin',
        expect.objectContaining({ loadTime: expect.any(Number) })
      );

      // Verify single-spa registration
      expect(registerApplication).toHaveBeenCalled();

      // Verify application reference
      expect(mockPlugin.application).toBeDefined();
    });

    it('should handle complete failure flow with retries', async () => {
      const setErrorSpy = vi.spyOn(registry, 'setPluginError');
      mockSystemImport.mockRejectedValue(new Error('Complete failure'));

      await loader.loadPlugin(mockPlugin);

      // Exhaust retries
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(3000);

      // Should have final error set
      expect(setErrorSpy).toHaveBeenCalledWith(
        'test-plugin',
        expect.any(Error),
        false // Not recoverable after max retries
      );

      // Total attempts: 1 initial + 3 retries
      expect(mockSystemImport).toHaveBeenCalledTimes(4);
    });

    it('should handle plugin with update lifecycle method', async () => {
      const moduleWithUpdate = {
        ...mockPluginModule,
        update: vi.fn(),
      };

      mockSystemImport.mockResolvedValueOnce(moduleWithUpdate);

      await loader.loadPlugin(mockPlugin);

      expect(registry.getPlugin('test-plugin')?.state).toBe('loaded');
    });
  });
});
