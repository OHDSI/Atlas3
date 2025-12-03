import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generatePluginRoutes, validatePluginRoute } from '@/plugins/navigation/PluginRoutes';
import { pluginRegistry } from '@/plugins/core/PluginRegistry';
import { PluginRegistration } from '@/models/PluginModels';
import { logger } from '@/utils/logger';

vi.mock('@/plugins/core/PluginRegistry', () => ({
  pluginRegistry: {
    getAllPlugins: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('PluginRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePluginRoutes', () => {
    it('should generate a catch-all route for plugin paths', () => {
      const routes = generatePluginRoutes();

      expect(routes).toHaveLength(1);
      expect(routes[0]).toMatchObject({
        path: '/plugins/:pluginId/:pathMatch(.*)*',
        name: 'PluginRoute',
        meta: {
          requiresAuth: true,
          isPluginRoute: true,
        },
      });
    });

    it('should include PluginContainer as component', () => {
      const routes = generatePluginRoutes();

      expect(routes[0].component).toBeDefined();
      expect(routes[0].component).toBeTruthy();
    });

    it('should return routes array on every call', () => {
      const routes1 = generatePluginRoutes();
      const routes2 = generatePluginRoutes();

      expect(routes1).toEqual(routes2);
      expect(routes1).not.toBe(routes2); // Different instances
    });

    it('should set requiresAuth to true in meta', () => {
      const routes = generatePluginRoutes();

      expect(routes[0].meta?.requiresAuth).toBe(true);
    });

    it('should set isPluginRoute to true in meta', () => {
      const routes = generatePluginRoutes();

      expect(routes[0].meta?.isPluginRoute).toBe(true);
    });
  });

  describe('validatePluginRoute', () => {
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
      vi.clearAllMocks();
    });

    it('should return true for valid plugin route with correct prefix', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([]);

      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/main');

      expect(result).toBe(true);
    });

    it('should return false if route does not start with /plugins/{pluginId}/', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([]);

      const result = validatePluginRoute('test-plugin', '/plugins/other-plugin/main');

      expect(result).toBe(false);
    });

    it('should return false if route is missing trailing slash after pluginId', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([]);

      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin');

      expect(result).toBe(false);
    });

    it('should return false if route does not start with /plugins/', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([]);

      const result = validatePluginRoute('test-plugin', '/other/test-plugin/main');

      expect(result).toBe(false);
    });

    it('should return false if route starts with plugin ID but wrong path', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([]);

      const result = validatePluginRoute('test-plugin', '/test-plugin/main');

      expect(result).toBe(false);
    });

    it.skip('should detect route conflicts with other plugins', () => {
      const conflictingPlugin: PluginRegistration = {
        id: 'other-plugin',
        name: 'Other Plugin',
        version: '1.0.0',
        entryPoint: 'other-plugin/index.js',
        menuItems: [
          {
            id: 'main',
            name: 'Other',
            route: '/plugins/test-plugin/main',
          },
        ],
      };

      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          registration: conflictingPlugin,
          state: 'loaded',
          authContext: mockAuthContext,
          messageBus: mockMessageBus,
        },
      ]);

      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/main');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'PluginRoutes',
        expect.stringContaining('Route conflict detected'),
        expect.anything()
      );
    });

    it('should log error with correct plugin ID on conflict', () => {
      const conflictingPlugin: PluginRegistration = {
        id: 'conflicting-plugin',
        name: 'Conflicting Plugin',
        version: '1.0.0',
        entryPoint: 'conflicting-plugin/index.js',
        menuItems: [
          {
            id: 'dashboard',
            name: 'Dashboard',
            route: '/plugins/my-plugin/dashboard',
          },
        ],
      };

      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          registration: conflictingPlugin,
          state: 'loaded',
          authContext: mockAuthContext,
          messageBus: mockMessageBus,
        },
      ]);

      validatePluginRoute('my-plugin', '/plugins/my-plugin/dashboard');

      expect(logger.error).toHaveBeenCalledWith(
        'PluginRoutes',
        'Route conflict detected: /plugins/my-plugin/dashboard is already used by plugin conflicting-plugin'
      );
    });

    it('should skip conflict check for the same plugin', () => {
      const samePlugin: PluginRegistration = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        entryPoint: 'test-plugin/index.js',
        menuItems: [
          {
            id: 'main',
            name: 'Main',
            route: '/plugins/test-plugin/main',
          },
        ],
      };

      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          registration: samePlugin,
          state: 'loaded',
          authContext: mockAuthContext,
          messageBus: mockMessageBus,
        },
      ]);

      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/main');

      expect(result).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle multiple plugins without conflicts', () => {
      const plugin1: PluginRegistration = {
        id: 'plugin1',
        name: 'Plugin 1',
        version: '1.0.0',
        entryPoint: 'plugin1/index.js',
        menuItems: [
          {
            id: 'main',
            name: 'Main',
            route: '/plugins/plugin1/main',
          },
        ],
      };

      const plugin2: PluginRegistration = {
        id: 'plugin2',
        name: 'Plugin 2',
        version: '1.0.0',
        entryPoint: 'plugin2/index.js',
        menuItems: [
          {
            id: 'dashboard',
            name: 'Dashboard',
            route: '/plugins/plugin2/dashboard',
          },
        ],
      };

      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          registration: plugin1,
          state: 'loaded',
          authContext: mockAuthContext,
          messageBus: mockMessageBus,
        },
        {
          registration: plugin2,
          state: 'loaded',
          authContext: mockAuthContext,
          messageBus: mockMessageBus,
        },
      ]);

      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/settings');

      expect(result).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle plugins with no menu items', () => {
      const pluginNoMenuItems: PluginRegistration = {
        id: 'no-menu-plugin',
        name: 'No Menu Plugin',
        version: '1.0.0',
        entryPoint: 'no-menu-plugin/index.js',
        menuItems: [],
      };

      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          registration: pluginNoMenuItems,
          state: 'loaded',
          authContext: mockAuthContext,
          messageBus: mockMessageBus,
        },
      ]);

      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/main');

      expect(result).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle plugins with multiple menu items', () => {
      const multiMenuPlugin: PluginRegistration = {
        id: 'multi-menu-plugin',
        name: 'Multi Menu Plugin',
        version: '1.0.0',
        entryPoint: 'multi-menu-plugin/index.js',
        menuItems: [
          {
            id: 'item1',
            name: 'Item 1',
            route: '/plugins/multi-menu-plugin/item1',
          },
          {
            id: 'item2',
            name: 'Item 2',
            route: '/plugins/multi-menu-plugin/item2',
          },
          {
            id: 'item3',
            name: 'Item 3',
            route: '/plugins/multi-menu-plugin/item3',
          },
        ],
      };

      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          registration: multiMenuPlugin,
          state: 'loaded',
          authContext: mockAuthContext,
          messageBus: mockMessageBus,
        },
      ]);

      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/main');

      expect(result).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should detect conflict in second menu item of plugin', () => {
      const multiMenuPlugin: PluginRegistration = {
        id: 'other-plugin',
        name: 'Other Plugin',
        version: '1.0.0',
        entryPoint: 'other-plugin/index.js',
        menuItems: [
          {
            id: 'item1',
            name: 'Item 1',
            route: '/plugins/other-plugin/item1',
          },
          {
            id: 'item2',
            name: 'Item 2',
            route: '/plugins/test-plugin/settings',
          },
        ],
      };

      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          registration: multiMenuPlugin,
          state: 'loaded',
          authContext: mockAuthContext,
          messageBus: mockMessageBus,
        },
      ]);

      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/settings');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'PluginRoutes',
        'Route conflict detected: /plugins/test-plugin/settings is already used by plugin other-plugin'
      );
    });

    it('should return true when no plugins are registered', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([]);

      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/any-route');

      expect(result).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle routes with query parameters', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([]);

      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/main?param=value');

      expect(result).toBe(true);
    });

    it('should handle routes with hash fragments', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([]);

      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/main#section');

      expect(result).toBe(true);
    });

    it('should handle nested route paths', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([]);

      const result = validatePluginRoute(
        'test-plugin',
        '/plugins/test-plugin/nested/path/deep/route'
      );

      expect(result).toBe(true);
    });

    it('should handle plugin IDs with hyphens', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([]);

      const result = validatePluginRoute(
        'my-custom-plugin',
        '/plugins/my-custom-plugin/dashboard'
      );

      expect(result).toBe(true);
    });

    it('should handle plugin IDs with underscores', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([]);

      const result = validatePluginRoute(
        'my_custom_plugin',
        '/plugins/my_custom_plugin/dashboard'
      );

      expect(result).toBe(true);
    });

    it.skip('should return false for empty plugin ID', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([]);

      const result = validatePluginRoute('', '/plugins//main');

      expect(result).toBe(false);
    });

    it('should return false for empty route', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([]);

      const result = validatePluginRoute('test-plugin', '');

      expect(result).toBe(false);
    });

    it('should handle case-sensitive plugin IDs', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([]);

      const result = validatePluginRoute('TestPlugin', '/plugins/testplugin/main');

      expect(result).toBe(false);
    });

    it('should validate route with special characters in path', () => {
      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([]);

      const result = validatePluginRoute(
        'test-plugin',
        '/plugins/test-plugin/path-with-special_chars.html'
      );

      expect(result).toBe(true);
    });

    it('should not confuse similar plugin IDs', () => {
      const plugin1: PluginRegistration = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        entryPoint: 'test/index.js',
        menuItems: [
          {
            id: 'main',
            name: 'Main',
            route: '/plugins/test/main',
          },
        ],
      };

      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          registration: plugin1,
          state: 'loaded',
          authContext: mockAuthContext,
          messageBus: mockMessageBus,
        },
      ]);

      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/main');

      expect(result).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle route that is substring of another route', () => {
      const plugin1: PluginRegistration = {
        id: 'other-plugin',
        name: 'Other',
        version: '1.0.0',
        entryPoint: 'other/index.js',
        menuItems: [
          {
            id: 'main',
            name: 'Main',
            route: '/plugins/test-plugin/main',
          },
        ],
      };

      vi.mocked(pluginRegistry.getAllPlugins).mockReturnValue([
        {
          registration: plugin1,
          state: 'loaded',
          authContext: mockAuthContext,
          messageBus: mockMessageBus,
        },
      ]);

      // This should conflict even though the test route is longer
      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/main');

      expect(result).toBe(false);
    });
  });
});
