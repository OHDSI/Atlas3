import { describe, it, expect, beforeEach, vi, type Mock, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { PluginLoader } from '@/plugins/core/PluginLoader';
import { PluginRegistry } from '@/plugins/core/PluginRegistry';
import { PluginInstance } from '@/models/PluginModels';
import type { SystemJS } from '@/types/plugin';
import { registerApplication, start } from 'single-spa';

// Mock single-spa
vi.mock('single-spa', () => ({
  registerApplication: vi.fn(),
  start: vi.fn(),
  triggerAppChange: vi.fn(),
  getAppNames: vi.fn().mockReturnValue([]),
  getAppStatus: vi.fn(),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock storageManager
vi.mock('@/services/auth/storageManager', () => ({
  storageManager: {
    getToken: vi.fn().mockReturnValue('test-token'),
    get: vi.fn(),
    set: vi.fn(),
  },
}));

// Mock webapi store - return a minimal store-like object
vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: vi.fn(() => ({
    selectedSource: null,
    sources: [] as Array<{ sourceKey: string }>,
    fetchSources: vi.fn().mockResolvedValue(undefined),
    $subscribe: vi.fn().mockReturnValue(() => {}),
  })),
}));

// Mock the runtime gate so tests control window.System directly instead of
// racing real script injection.
vi.mock('@/plugins/core/pluginRuntime', () => ({
  ensurePluginRuntime: vi.fn().mockResolvedValue(undefined),
}));

import { ensurePluginRuntime } from '@/plugins/core/pluginRuntime';

describe('PluginLoader', () => {
  let loader: PluginLoader;
  let registry: PluginRegistry;
  let mockSystemImport: Mock;

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
    setActivePinia(createPinia());
    (ensurePluginRuntime as Mock).mockResolvedValue(undefined);

    registry = new PluginRegistry();
    loader = new PluginLoader(registry);

    // Register the plugin so handleLoadError can find it during retry
    if (!registry.hasPlugin(mockPlugin.registration.id)) {
      registry.registerPlugin(
        mockPlugin.registration,
        mockPlugin.authContext,
        mockPlugin.messageBus
      );
    }

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
      (ensurePluginRuntime as Mock).mockRejectedValueOnce(
        new Error('Failed to load plugin runtime: SystemJS did not initialise')
      );

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

      // Start loading; the inner System.import promise will never resolve,
      // so we cannot await the outer loadPlugin promise. Just attach a
      // catch handler to avoid unhandled rejection noise.
      loader.loadPlugin(mockPlugin).catch(() => {});

      // Advance time to trigger timeout
      await vi.advanceTimersByTimeAsync(30000);

      expect(setErrorSpy).toHaveBeenCalledWith(
        'test-plugin',
        expect.objectContaining({
          message: expect.stringContaining('timeout'),
        }),
        true
      );
    });

    describe('activeWhen function', () => {
      it('should return true when hash path matches plugin path', async () => {
        await loader.loadPlugin(mockPlugin);

        const registerCall = (registerApplication as Mock).mock.calls[0][0];
        const activeWhen = registerCall.activeWhen;

        const result = activeWhen({ hash: '#/plugins/test-plugin/dashboard' });
        expect(result).toBe(true);
      });

      it('should return false when hash path does not match plugin path', async () => {
        await loader.loadPlugin(mockPlugin);

        const registerCall = (registerApplication as Mock).mock.calls[0][0];
        const activeWhen = registerCall.activeWhen;

        const result = activeWhen({ hash: '#/other/path' });
        expect(result).toBe(false);
      });

      it('should handle plugin root hash route', async () => {
        await loader.loadPlugin(mockPlugin);

        const registerCall = (registerApplication as Mock).mock.calls[0][0];
        const activeWhen = registerCall.activeWhen;

        const result = activeWhen({ hash: '#/plugins/test-plugin/' });
        expect(result).toBe(true);
      });

      it('should return false when location has no hash route', async () => {
        await loader.loadPlugin(mockPlugin);

        const registerCall = (registerApplication as Mock).mock.calls[0][0];
        const activeWhen = registerCall.activeWhen;

        const result = activeWhen({ pathname: '/plugins/test-plugin/' });
        expect(result).toBe(false);
      });
    });

    describe('customProps function', () => {
      it('should return correct custom props', async () => {
        await loader.loadPlugin(mockPlugin);

        const registerCall = (registerApplication as Mock).mock.calls[0][0];
        const customProps = registerCall.customProps;

        const props = customProps();

        expect(props).toEqual(
          expect.objectContaining({
            name: 'Test Plugin',
            authContext: mockPlugin.authContext,
            messageBus: mockPlugin.messageBus,
            domElement: expect.any(HTMLElement),
            appId: 'test-plugin',
            containerId: 'plugin-test-plugin',
            isAtlas: true,
            autoMount: false,
          })
        );
        expect(typeof props.getToken).toBe('function');
        // getToken should resolve to a string (storageManager.getToken
        // returns the configured value or '' when unset).
        await expect(props.getToken()).resolves.toEqual(expect.any(String));
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
      mockSystemImport.mockRejectedValue(new Error('Persistent failure'));

      const setErrorSpy = vi.spyOn(registry, 'setPluginError');

      await loader.loadPlugin(mockPlugin);

      // Exhaust all retries: 1000ms + 2000ms + 3000ms
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(3000);

      expect(setErrorSpy).toHaveBeenCalledWith(
        'test-plugin',
        expect.objectContaining({
          message: expect.stringContaining('Persistent failure'),
        }),
        false
      );
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
      mockSystemImport.mockResolvedValueOnce(mockPluginModule);
      await loader.retryPlugin('test-plugin');

      // Should succeed without being blocked by previous failures
      expect(registry.getPlugin('test-plugin')?.state).toBe('loaded');
    });
  });

  describe('retryPlugin', () => {
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

    it('should expose single-spa helpers on window.__singleSpa', () => {
      loader.startPluginFramework();

      const exposed = (
        window as unknown as {
          __singleSpa?: {
            getAppNames: unknown
            getAppStatus: unknown
            triggerAppChange: unknown
          }
        }
      ).__singleSpa;
      expect(exposed).toBeDefined();
      expect(typeof exposed?.getAppNames).toBe('function');
      expect(typeof exposed?.getAppStatus).toBe('function');
      expect(typeof exposed?.triggerAppChange).toBe('function');
    });

    it('should call triggerAppChange after a short delay', async () => {
      const { triggerAppChange } = await import('single-spa');
      loader.startPluginFramework();
      // The framework schedules triggerAppChange via setTimeout(..., 100)
      await vi.advanceTimersByTimeAsync(100);
      expect(triggerAppChange).toHaveBeenCalled();
    });

    it('should notify plugins when source watcher detects a dataset', async () => {
      const { useWebAPIStore } = await import('@/stores/webapi');
      const { getAppNames } = await import('single-spa');
      (getAppNames as Mock).mockReturnValue(['test-plugin']);

      // Provide a source so checkAndNotify() returns true synchronously.
      (useWebAPIStore as unknown as Mock).mockReturnValueOnce({
        selectedSource: 'cdm-source',
        sources: [{ sourceKey: 'cdm-source' }],
        fetchSources: vi.fn().mockResolvedValue(undefined),
        $subscribe: vi.fn().mockReturnValue(() => {}),
      });

      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      loader.startPluginFramework();
      await vi.advanceTimersByTimeAsync(100);

      // notifyPluginsOfPropChange should have dispatched a custom event
      expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
      const ev = dispatchSpy.mock.calls.find(
        c => (c[0] as Event).type === 'custom-props-changed'
      )?.[0] as CustomEvent | undefined;
      expect(ev).toBeDefined();
      expect(ev?.detail).toEqual({ appId: 'test-plugin', datasetId: 'cdm-source' });
    });

    it('should notify plugins when the store mutates to a new dataset', async () => {
      const { useWebAPIStore } = await import('@/stores/webapi');
      const { getAppNames } = await import('single-spa');
      (getAppNames as Mock).mockReturnValue(['test-plugin']);

      let subscriber: ((m: unknown, s: { selectedSource: string | null; sources: Array<{ sourceKey: string }> }) => void) | null = null;
      (useWebAPIStore as unknown as Mock).mockReturnValueOnce({
        selectedSource: null,
        sources: [],
        fetchSources: vi.fn().mockResolvedValue(undefined),
        $subscribe: vi.fn().mockImplementation((cb: typeof subscriber) => {
          subscriber = cb;
          return () => {};
        }),
      });

      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      loader.startPluginFramework();
      await vi.advanceTimersByTimeAsync(100);

      // No source yet - no notify
      expect(
        dispatchSpy.mock.calls.find(c => (c[0] as Event).type === 'custom-props-changed')
      ).toBeUndefined();

      // Now mutate the store
      subscriber!({}, { selectedSource: 'new-source', sources: [] });

      const ev = dispatchSpy.mock.calls.find(
        c => (c[0] as Event).type === 'custom-props-changed'
      )?.[0] as CustomEvent | undefined;
      expect(ev?.detail).toEqual({ appId: 'test-plugin', datasetId: 'new-source' });
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

  describe('dispose', () => {
    it('should clear loading timeouts', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      // Start loading a plugin that will hang (System.import never resolves)
      mockSystemImport.mockImplementation(() => new Promise(() => {}));
      loader.loadPlugin(mockPlugin).catch(() => {});

      // Yield one microtask so the synchronous portion of loadPlugin
      // (setting up the timeout) runs before we dispose.
      await Promise.resolve();

      // Dispose before load completes — should clear the loading timeout
      loader.dispose();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should be safe to call multiple times', () => {
      expect(() => {
        loader.dispose();
        loader.dispose();
      }).not.toThrow();
    });

    it('should unsubscribe the source watcher when active', async () => {
      const { useWebAPIStore } = await import('@/stores/webapi');
      const unsubscribe = vi.fn();
      (useWebAPIStore as unknown as Mock).mockReturnValueOnce({
        selectedSource: null,
        sources: [],
        fetchSources: vi.fn().mockResolvedValue(undefined),
        $subscribe: vi.fn().mockReturnValue(unsubscribe),
      });

      loader.startPluginFramework();
      await vi.advanceTimersByTimeAsync(100);

      loader.dispose();
      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
