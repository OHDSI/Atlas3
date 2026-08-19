import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { generatePluginMenuItems, shouldUseVirtualScrolling, getMenuItemsForPlugin } from '@/plugins/navigation/PluginMenuIntegration';
import { generatePluginRoutes, validatePluginRoute } from '@/plugins/navigation/PluginRoutes';
import { pluginRegistry } from '@/plugins/core/PluginRegistry';
import type { PluginInstance, MenuItemConfiguration } from '@/models/PluginModels';
import { logger } from '@/utils/logger';

// Mock the logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PluginMenuIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all registered plugins before each test
    pluginRegistry.getAllPlugins().forEach(plugin => {
      pluginRegistry.unregisterPlugin(plugin.registration.id);
    });
  });

  afterEach(() => {
    // Clean up plugins after each test
    pluginRegistry.getAllPlugins().forEach(plugin => {
      pluginRegistry.unregisterPlugin(plugin.registration.id);
    });
  });

  const createMockPlugin = (
    id: string,
    menuItems: MenuItemConfiguration[],
    state: PluginInstance['state'] = 'loaded'
  ): PluginInstance => {
    const plugin: PluginInstance = {
      registration: {
        id,
        name: `${id} Plugin`,
        version: '1.0.0',
        entryPoint: `${id}/index.js`,
        menuItems,
      },
      state,
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

    pluginRegistry.registerPlugin(
      plugin.registration,
      plugin.authContext,
      plugin.messageBus
    );

    // Update state if not 'not-loaded'
    if (state !== 'not-loaded') {
      pluginRegistry.updatePluginState(id, state);
    }

    return plugin;
  };

  describe('generatePluginMenuItems', () => {
    it('should return empty array when no plugins are registered', () => {
      const menuItems = generatePluginMenuItems();
      expect(menuItems).toEqual([]);
    });

    it('should generate menu items from single plugin', () => {
      createMockPlugin('test-plugin', [
        {
          id: 'item-1',
          name: 'Test Item',
          route: '/plugins/test-plugin/dashboard',
          icon: 'mdi-home',
          order: 1,
        },
      ]);

      const menuItems = generatePluginMenuItems();

      expect(menuItems).toHaveLength(1);
      expect(menuItems[0]).toMatchObject({
        id: 'test-plugin-item-1',
        pluginId: 'test-plugin',
        name: 'Test Item',
        route: '/plugins/test-plugin/dashboard',
        icon: 'mdi-home',
        order: 1,
        visible: true,
      });
    });

    it('should generate menu items from multiple plugins', () => {
      createMockPlugin('plugin-a', [
        {
          id: 'item-1',
          name: 'Plugin A Item',
          route: '/plugins/plugin-a/page',
        },
      ]);

      createMockPlugin('plugin-b', [
        {
          id: 'item-1',
          name: 'Plugin B Item',
          route: '/plugins/plugin-b/page',
        },
      ]);

      const menuItems = generatePluginMenuItems();

      expect(menuItems).toHaveLength(2);
      expect(menuItems.map(item => item.pluginId)).toEqual(['plugin-a', 'plugin-b']);
    });

    it('should skip plugins in error state', () => {
      createMockPlugin('working-plugin', [
        {
          id: 'item-1',
          name: 'Working Item',
          route: '/plugins/working-plugin/page',
        },
      ]);

      createMockPlugin('error-plugin', [
        {
          id: 'item-1',
          name: 'Error Item',
          route: '/plugins/error-plugin/page',
        },
      ], 'error');

      const menuItems = generatePluginMenuItems();

      expect(menuItems).toHaveLength(1);
      expect(menuItems[0].pluginId).toBe('working-plugin');
    });

    it('should prefix menu item IDs with plugin ID', () => {
      createMockPlugin('test-plugin', [
        {
          id: 'dashboard',
          name: 'Dashboard',
          route: '/plugins/test-plugin/dashboard',
        },
        {
          id: 'settings',
          name: 'Settings',
          route: '/plugins/test-plugin/settings',
        },
      ]);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].id).toBe('test-plugin-dashboard');
      expect(menuItems[1].id).toBe('test-plugin-settings');
    });

    it('should use default order value of 999 when order is not specified', () => {
      createMockPlugin('test-plugin', [
        {
          id: 'item-1',
          name: 'Item 1',
          route: '/plugins/test-plugin/item-1',
        },
      ]);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].order).toBe(999);
    });

    it('should sort menu items by order', () => {
      createMockPlugin('test-plugin', [
        {
          id: 'item-3',
          name: 'Item 3',
          route: '/plugins/test-plugin/item-3',
          order: 30,
        },
        {
          id: 'item-1',
          name: 'Item 1',
          route: '/plugins/test-plugin/item-1',
          order: 10,
        },
        {
          id: 'item-2',
          name: 'Item 2',
          route: '/plugins/test-plugin/item-2',
          order: 20,
        },
      ]);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].id).toBe('test-plugin-item-1');
      expect(menuItems[1].id).toBe('test-plugin-item-2');
      expect(menuItems[2].id).toBe('test-plugin-item-3');
    });

    it('should handle parentId by prefixing with plugin ID', () => {
      createMockPlugin('test-plugin', [
        {
          id: 'parent',
          name: 'Parent',
          route: '/plugins/test-plugin/parent',
        },
        {
          id: 'child',
          name: 'Child',
          route: '/plugins/test-plugin/child',
          parentId: 'parent',
        },
      ]);

      const menuItems = generatePluginMenuItems();
      const childItem = menuItems.find(item => item.id === 'test-plugin-child');

      expect(childItem?.parentId).toBe('test-plugin-parent');
    });

    it('should handle menu items without parentId', () => {
      createMockPlugin('test-plugin', [
        {
          id: 'item',
          name: 'Item',
          route: '/plugins/test-plugin/item',
        },
      ]);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].parentId).toBeUndefined();
    });

    it('should default visible to true when not specified', () => {
      createMockPlugin('test-plugin', [
        {
          id: 'item',
          name: 'Item',
          route: '/plugins/test-plugin/item',
        },
      ]);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].visible).toBe(true);
    });

    it('should respect visible property when explicitly set', () => {
      createMockPlugin('test-plugin', [
        {
          id: 'visible-item',
          name: 'Visible Item',
          route: '/plugins/test-plugin/visible',
          visible: true,
        },
        {
          id: 'hidden-item',
          name: 'Hidden Item',
          route: '/plugins/test-plugin/hidden',
          visible: false,
        },
      ]);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].visible).toBe(true);
      expect(menuItems[1].visible).toBe(false);
    });

    it('should include badge information when provided', () => {
      createMockPlugin('test-plugin', [
        {
          id: 'item',
          name: 'Item',
          route: '/plugins/test-plugin/item',
          badge: {
            content: 5,
            color: 'red',
          },
        },
      ]);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].badge).toEqual({
        content: 5,
        color: 'red',
      });
    });

    it('should handle badge with string content', () => {
      createMockPlugin('test-plugin', [
        {
          id: 'item',
          name: 'Item',
          route: '/plugins/test-plugin/item',
          badge: {
            content: 'NEW',
          },
        },
      ]);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].badge?.content).toBe('NEW');
    });

    it('should handle menu items without badge', () => {
      createMockPlugin('test-plugin', [
        {
          id: 'item',
          name: 'Item',
          route: '/plugins/test-plugin/item',
        },
      ]);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].badge).toBeUndefined();
    });

    it('should handle multiple menu items per plugin', () => {
      createMockPlugin('test-plugin', [
        {
          id: 'item-1',
          name: 'Item 1',
          route: '/plugins/test-plugin/item-1',
        },
        {
          id: 'item-2',
          name: 'Item 2',
          route: '/plugins/test-plugin/item-2',
        },
        {
          id: 'item-3',
          name: 'Item 3',
          route: '/plugins/test-plugin/item-3',
        },
      ]);

      const menuItems = generatePluginMenuItems();

      expect(menuItems).toHaveLength(3);
      expect(menuItems.every(item => item.pluginId === 'test-plugin')).toBe(true);
    });

    it('should handle plugins with no menu items', () => {
      createMockPlugin('plugin-with-items', [
        {
          id: 'item',
          name: 'Item',
          route: '/plugins/plugin-with-items/item',
        },
      ]);

      createMockPlugin('plugin-without-items', []);

      const menuItems = generatePluginMenuItems();

      expect(menuItems).toHaveLength(1);
      expect(menuItems[0].pluginId).toBe('plugin-with-items');
    });

    it('should include icon when provided', () => {
      createMockPlugin('test-plugin', [
        {
          id: 'item',
          name: 'Item',
          route: '/plugins/test-plugin/item',
          icon: 'mdi-cog',
        },
      ]);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].icon).toBe('mdi-cog');
    });

    it('should handle menu items without icon', () => {
      createMockPlugin('test-plugin', [
        {
          id: 'item',
          name: 'Item',
          route: '/plugins/test-plugin/item',
        },
      ]);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].icon).toBeUndefined();
    });

    it('should maintain order across multiple plugins', () => {
      createMockPlugin('plugin-a', [
        {
          id: 'item-high',
          name: 'High Priority',
          route: '/plugins/plugin-a/high',
          order: 100,
        },
      ]);

      createMockPlugin('plugin-b', [
        {
          id: 'item-low',
          name: 'Low Priority',
          route: '/plugins/plugin-b/low',
          order: 1,
        },
      ]);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].pluginId).toBe('plugin-b');
      expect(menuItems[1].pluginId).toBe('plugin-a');
    });

    it('should handle all plugin lifecycle states except error', () => {
      const states: Array<PluginInstance['state']> = [
        'not-loaded',
        'loading',
        'loaded',
        'bootstrapping',
        'not-mounted',
        'mounting',
        'mounted',
        'unmounting',
      ];

      states.forEach((state) => {
        createMockPlugin(`plugin-${state}`, [
          {
            id: 'item',
            name: `Item ${state}`,
            route: `/plugins/plugin-${state}/item`,
          },
        ], state);
      });

      const menuItems = generatePluginMenuItems();

      expect(menuItems).toHaveLength(states.length);
    });
  });

  describe('shouldUseVirtualScrolling', () => {
    it('should return false for item count of 50 or less', () => {
      expect(shouldUseVirtualScrolling(0)).toBe(false);
      expect(shouldUseVirtualScrolling(1)).toBe(false);
      expect(shouldUseVirtualScrolling(25)).toBe(false);
      expect(shouldUseVirtualScrolling(50)).toBe(false);
    });

    it('should return true for item count greater than 50', () => {
      expect(shouldUseVirtualScrolling(51)).toBe(true);
      expect(shouldUseVirtualScrolling(100)).toBe(true);
      expect(shouldUseVirtualScrolling(1000)).toBe(true);
    });

    it('should handle negative numbers', () => {
      expect(shouldUseVirtualScrolling(-1)).toBe(false);
      expect(shouldUseVirtualScrolling(-100)).toBe(false);
    });

    it('should handle decimal numbers', () => {
      expect(shouldUseVirtualScrolling(50.5)).toBe(true);
      expect(shouldUseVirtualScrolling(50.1)).toBe(true);
    });
  });

  describe('getMenuItemsForPlugin', () => {
    beforeEach(() => {
      createMockPlugin('plugin-a', [
        {
          id: 'item-1',
          name: 'Plugin A Item 1',
          route: '/plugins/plugin-a/item-1',
        },
        {
          id: 'item-2',
          name: 'Plugin A Item 2',
          route: '/plugins/plugin-a/item-2',
        },
      ]);

      createMockPlugin('plugin-b', [
        {
          id: 'item-1',
          name: 'Plugin B Item 1',
          route: '/plugins/plugin-b/item-1',
        },
      ]);
    });

    it('should return menu items only for specified plugin', () => {
      const items = getMenuItemsForPlugin('plugin-a');

      expect(items).toHaveLength(2);
      expect(items.every(item => item.pluginId === 'plugin-a')).toBe(true);
    });

    it('should return empty array for non-existent plugin', () => {
      const items = getMenuItemsForPlugin('non-existent');

      expect(items).toEqual([]);
    });

    it('should return empty array for plugin with no menu items', () => {
      createMockPlugin('plugin-no-items', []);

      const items = getMenuItemsForPlugin('plugin-no-items');

      expect(items).toEqual([]);
    });

    it('should not return items from other plugins', () => {
      const items = getMenuItemsForPlugin('plugin-b');

      expect(items).toHaveLength(1);
      expect(items[0].pluginId).toBe('plugin-b');
    });

    it('should return items in sorted order', () => {
      createMockPlugin('plugin-ordered', [
        {
          id: 'item-3',
          name: 'Third',
          route: '/plugins/plugin-ordered/third',
          order: 30,
        },
        {
          id: 'item-1',
          name: 'First',
          route: '/plugins/plugin-ordered/first',
          order: 10,
        },
        {
          id: 'item-2',
          name: 'Second',
          route: '/plugins/plugin-ordered/second',
          order: 20,
        },
      ]);

      const items = getMenuItemsForPlugin('plugin-ordered');

      expect(items[0].id).toBe('plugin-ordered-item-1');
      expect(items[1].id).toBe('plugin-ordered-item-2');
      expect(items[2].id).toBe('plugin-ordered-item-3');
    });
  });
});

describe('PluginRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all registered plugins before each test
    pluginRegistry.getAllPlugins().forEach(plugin => {
      pluginRegistry.unregisterPlugin(plugin.registration.id);
    });
  });

  afterEach(() => {
    // Clean up plugins after each test
    pluginRegistry.getAllPlugins().forEach(plugin => {
      pluginRegistry.unregisterPlugin(plugin.registration.id);
    });
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

    it('should include PluginContainer component in route', () => {
      const routes = generatePluginRoutes();

      expect(routes[0].component).toBeDefined();
    });

    it('should always return same route configuration', () => {
      const routes1 = generatePluginRoutes();
      const routes2 = generatePluginRoutes();

      expect(routes1).toEqual(routes2);
    });

    it('should set requiresAuth meta to true', () => {
      const routes = generatePluginRoutes();

      expect(routes[0].meta?.requiresAuth).toBe(true);
    });

    it('should set isPluginRoute meta to true', () => {
      const routes = generatePluginRoutes();

      expect(routes[0].meta?.isPluginRoute).toBe(true);
    });

    it('should use dynamic pluginId parameter', () => {
      const routes = generatePluginRoutes();

      expect(routes[0].path).toContain(':pluginId');
    });

    it('should use catch-all pathMatch parameter', () => {
      const routes = generatePluginRoutes();

      expect(routes[0].path).toContain(':pathMatch(.*)*');
    });
  });

  describe('validatePluginRoute', () => {
    const createMockPlugin = (
      id: string,
      menuItems: MenuItemConfiguration[]
    ): PluginInstance => {
      const plugin: PluginInstance = {
        registration: {
          id,
          name: `${id} Plugin`,
          version: '1.0.0',
          entryPoint: `${id}/index.js`,
          menuItems,
        },
        state: 'loaded',
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

      pluginRegistry.registerPlugin(
        plugin.registration,
        plugin.authContext,
        plugin.messageBus
      );

      return plugin;
    };

    it('should validate route with correct plugin ID prefix', () => {
      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/dashboard');

      expect(result).toBe(true);
    });

    it('should reject route without /plugins/ prefix', () => {
      const result = validatePluginRoute('test-plugin', '/test-plugin/dashboard');

      expect(result).toBe(false);
    });

    it('should reject route with wrong plugin ID', () => {
      const result = validatePluginRoute('test-plugin', '/plugins/other-plugin/dashboard');

      expect(result).toBe(false);
    });

    it('should reject route with missing trailing slash after plugin ID', () => {
      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin');

      expect(result).toBe(false);
    });

    it('should validate route with nested paths', () => {
      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/settings/advanced');

      expect(result).toBe(true);
    });

    it('should detect route conflicts with other plugins', () => {
      createMockPlugin('plugin-a', [
        {
          id: 'dashboard',
          name: 'Dashboard',
          route: '/plugins/plugin-b/conflicting-route',
        },
      ]);

      const result = validatePluginRoute('plugin-b', '/plugins/plugin-b/conflicting-route');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'PluginRoutes',
        expect.stringContaining('Route conflict detected')
      );
    });

    it('should allow same route for same plugin', () => {
      createMockPlugin('test-plugin', [
        {
          id: 'dashboard',
          name: 'Dashboard',
          route: '/plugins/test-plugin/dashboard',
        },
      ]);

      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/dashboard');

      expect(result).toBe(true);
    });

    it('should not detect false conflicts with similar routes', () => {
      createMockPlugin('plugin-a', [
        {
          id: 'dashboard',
          name: 'Dashboard',
          route: '/plugins/plugin-a/dashboard',
        },
      ]);

      const result = validatePluginRoute('plugin-b', '/plugins/plugin-b/dashboard');

      expect(result).toBe(true);
    });

    it('should handle plugin with multiple menu items', () => {
      createMockPlugin('plugin-a', [
        {
          id: 'item-1',
          name: 'Item 1',
          route: '/plugins/plugin-b/item-1',
        },
        {
          id: 'item-2',
          name: 'Item 2',
          route: '/plugins/plugin-b/item-2',
        },
      ]);

      const result1 = validatePluginRoute('plugin-b', '/plugins/plugin-b/item-1');
      const result2 = validatePluginRoute('plugin-b', '/plugins/plugin-b/item-2');

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it('should handle plugins with no menu items', () => {
      createMockPlugin('plugin-a', []);

      const result = validatePluginRoute('plugin-b', '/plugins/plugin-b/dashboard');

      expect(result).toBe(true);
    });

    it('should validate route when no other plugins exist', () => {
      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/dashboard');

      expect(result).toBe(true);
    });

    it('should handle route with query parameters pattern', () => {
      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/page?id=123');

      expect(result).toBe(true);
    });

    it('should handle route with hash pattern', () => {
      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/page#section');

      expect(result).toBe(true);
    });

    it('should log error message with conflicting route details', () => {
      createMockPlugin('existing-plugin', [
        {
          id: 'page',
          name: 'Page',
          route: '/plugins/new-plugin/conflict',
        },
      ]);

      validatePluginRoute('new-plugin', '/plugins/new-plugin/conflict');

      expect(logger.error).toHaveBeenCalledWith(
        'PluginRoutes',
        expect.stringContaining('/plugins/new-plugin/conflict')
      );
      expect(logger.error).toHaveBeenCalledWith(
        'PluginRoutes',
        expect.stringContaining('existing-plugin')
      );
    });

    it('should handle plugin IDs with hyphens', () => {
      const result = validatePluginRoute('my-test-plugin', '/plugins/my-test-plugin/page');

      expect(result).toBe(true);
    });

    it('should handle plugin IDs with underscores', () => {
      const result = validatePluginRoute('my_test_plugin', '/plugins/my_test_plugin/page');

      expect(result).toBe(true);
    });

    it('should reject empty plugin ID', () => {
      const result = validatePluginRoute('test-plugin', '/plugins//page');

      expect(result).toBe(false);
    });

    it('should reject route without page path after plugin ID', () => {
      const result = validatePluginRoute('test-plugin', '/plugins/test-plugin/');

      expect(result).toBe(true); // Trailing slash is valid
    });

    it('should handle case-sensitive plugin IDs', () => {
      const result1 = validatePluginRoute('TestPlugin', '/plugins/TestPlugin/page');
      const result2 = validatePluginRoute('TestPlugin', '/plugins/testplugin/page');

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });
});
