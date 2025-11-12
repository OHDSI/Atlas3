import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginRegistry } from '@/plugins/core/PluginRegistry';
import { PluginRegistration, PluginLifecycleState } from '@/models/PluginModels';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;
  
  const mockRegistration: PluginRegistration = {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    entryPoint: 'test-plugin/index.js',
    menuItems: [
      {
        id: 'main',
        name: 'Test',
        route: '/plugins/test-plugin/main',
      }
    ],
  };

  const mockAuthContext = {
    user: {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      permissions: ['read'],
    },
    token: 'test-token',
    isAuthenticated: true,
    hasPermission: (permission: string) => permission === 'read',
  };

  const mockMessageBus = {
    send: vi.fn(),
    request: vi.fn(),
    subscribe: vi.fn(),
  };

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe('registerPlugin', () => {
    it('should register a new plugin', () => {
      const instance = registry.registerPlugin(
        mockRegistration,
        mockAuthContext,
        mockMessageBus
      );

      expect(instance).toBeDefined();
      expect(instance.registration.id).toBe('test-plugin');
      expect(instance.state).toBe('not-loaded');
    });

    it('should throw error if plugin already registered', () => {
      registry.registerPlugin(mockRegistration, mockAuthContext, mockMessageBus);

      expect(() => {
        registry.registerPlugin(mockRegistration, mockAuthContext, mockMessageBus);
      }).toThrow('already registered');
    });
  });

  describe('getPlugin', () => {
    it('should return registered plugin', () => {
      registry.registerPlugin(mockRegistration, mockAuthContext, mockMessageBus);
      
      const plugin = registry.getPlugin('test-plugin');
      
      expect(plugin).toBeDefined();
      expect(plugin?.registration.id).toBe('test-plugin');
    });

    it('should return undefined for non-existent plugin', () => {
      const plugin = registry.getPlugin('non-existent');
      
      expect(plugin).toBeUndefined();
    });
  });

  describe('updatePluginState', () => {
    it('should update plugin state', () => {
      registry.registerPlugin(mockRegistration, mockAuthContext, mockMessageBus);
      
      registry.updatePluginState('test-plugin', 'loading');
      
      const plugin = registry.getPlugin('test-plugin');
      expect(plugin?.state).toBe('loading');
    });

    it('should notify state listeners', () => {
      registry.registerPlugin(mockRegistration, mockAuthContext, mockMessageBus);
      
      const callback = vi.fn();
      registry.onStateChange('test-plugin', callback);
      
      registry.updatePluginState('test-plugin', 'loaded');
      
      expect(callback).toHaveBeenCalledWith('loaded');
    });
  });

  describe('setPluginError', () => {
    it('should set error state and details', () => {
      registry.registerPlugin(mockRegistration, mockAuthContext, mockMessageBus);
      
      const error = new Error('Test error');
      registry.setPluginError('test-plugin', error, true);
      
      const plugin = registry.getPlugin('test-plugin');
      expect(plugin?.state).toBe('error');
      expect(plugin?.error?.message).toBe('Test error');
      expect(plugin?.error?.recoverable).toBe(true);
    });
  });

  describe('getPluginsByState', () => {
    it('should return plugins filtered by state', () => {
      registry.registerPlugin(mockRegistration, mockAuthContext, mockMessageBus);
      
      const anotherPlugin: PluginRegistration = {
        ...mockRegistration,
        id: 'another-plugin',
      };
      registry.registerPlugin(anotherPlugin, mockAuthContext, mockMessageBus);
      
      registry.updatePluginState('test-plugin', 'loaded');
      
      const loadedPlugins = registry.getPluginsByState('loaded');
      expect(loadedPlugins).toHaveLength(1);
      expect(loadedPlugins[0].registration.id).toBe('test-plugin');
    });
  });

  describe('unregisterPlugin', () => {
    it('should remove plugin from registry', () => {
      registry.registerPlugin(mockRegistration, mockAuthContext, mockMessageBus);
      
      registry.unregisterPlugin('test-plugin');
      
      const plugin = registry.getPlugin('test-plugin');
      expect(plugin).toBeUndefined();
    });

    it('should notify change listeners', () => {
      registry.registerPlugin(mockRegistration, mockAuthContext, mockMessageBus);
      
      const callback = vi.fn();
      registry.onPluginChange(callback);
      
      registry.unregisterPlugin('test-plugin');
      
      expect(callback).toHaveBeenCalledWith('removed', 'test-plugin');
    });
  });

  describe('updatePluginMetrics', () => {
    it('should update plugin performance metrics', () => {
      registry.registerPlugin(mockRegistration, mockAuthContext, mockMessageBus);
      
      registry.updatePluginMetrics('test-plugin', {
        loadTime: 150,
        mountTime: 50,
      });
      
      const plugin = registry.getPlugin('test-plugin');
      expect(plugin?.metrics?.loadTime).toBe(150);
      expect(plugin?.metrics?.mountTime).toBe(50);
    });
  });
});
