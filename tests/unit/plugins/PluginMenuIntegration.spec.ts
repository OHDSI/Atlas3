import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  generatePluginMenuItems,
  shouldUseVirtualScrolling,
  getMenuItemsForPlugin
} from '@/plugins/navigation/PluginMenuIntegration';
import { pluginRegistry } from '@/plugins/core/PluginRegistry';
import { PluginRegistration } from '@/models/PluginModels';

describe('PluginMenuIntegration', () => {
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

  const createMockPlugin = (
    id: string,
    menuItems: PluginRegistration['menuItems'] = []
  ): PluginRegistration => ({
    id,
    name: `${id} Plugin`,
    version: '1.0.0',
    entryPoint: `${id}/index.js`,
    menuItems,
  });

  beforeEach(() => {
    // Clear all plugins before each test
    const allPlugins = pluginRegistry.getAllPlugins();
    allPlugins.forEach(plugin => {
      pluginRegistry.unregisterPlugin(plugin.registration.id);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePluginMenuItems', () => {
    it('should return empty array when no plugins registered', () => {
      const menuItems = generatePluginMenuItems();
      expect(menuItems).toEqual([]);
    });

    it('should generate menu items from single plugin', () => {
      const plugin = createMockPlugin('test-plugin', [
        {
          id: 'menu-1',
          name: 'Test Menu',
          route: '/test',
        },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems).toHaveLength(1);
      expect(menuItems[0]).toEqual({
        id: 'test-plugin-menu-1',
        pluginId: 'test-plugin',
        name: 'Test Menu',
        route: '/test',
        icon: undefined,
        order: 999,
        parentId: undefined,
        visible: true,
        badge: undefined,
      });
    });

    it('should generate menu items from multiple plugins', () => {
      const plugin1 = createMockPlugin('plugin-1', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1' },
      ]);
      const plugin2 = createMockPlugin('plugin-2', [
        { id: 'menu-2', name: 'Menu 2', route: '/menu2' },
      ]);

      pluginRegistry.registerPlugin(plugin1, mockAuthContext, mockMessageBus);
      pluginRegistry.registerPlugin(plugin2, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems).toHaveLength(2);
      expect(menuItems.map(item => item.pluginId)).toContain('plugin-1');
      expect(menuItems.map(item => item.pluginId)).toContain('plugin-2');
    });

    it('should skip plugins in error state', () => {
      const plugin1 = createMockPlugin('plugin-1', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1' },
      ]);
      const plugin2 = createMockPlugin('plugin-2', [
        { id: 'menu-2', name: 'Menu 2', route: '/menu2' },
      ]);

      pluginRegistry.registerPlugin(plugin1, mockAuthContext, mockMessageBus);
      pluginRegistry.registerPlugin(plugin2, mockAuthContext, mockMessageBus);

      // Set plugin-1 to error state
      pluginRegistry.setPluginError('plugin-1', new Error('Test error'), false);

      const menuItems = generatePluginMenuItems();

      expect(menuItems).toHaveLength(1);
      expect(menuItems[0].pluginId).toBe('plugin-2');
    });

    it('should handle menu items with all optional properties', () => {
      const plugin = createMockPlugin('test-plugin', [
        {
          id: 'menu-1',
          name: 'Test Menu',
          route: '/test',
          icon: 'mdi-home',
          order: 5,
          parentId: 'parent-1',
          visible: false,
          badge: {
            content: 'NEW',
            color: 'red',
          },
        },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems).toHaveLength(1);
      expect(menuItems[0]).toEqual({
        id: 'test-plugin-menu-1',
        pluginId: 'test-plugin',
        name: 'Test Menu',
        route: '/test',
        icon: 'mdi-home',
        order: 5,
        parentId: 'test-plugin-parent-1',
        visible: false,
        badge: {
          content: 'NEW',
          color: 'red',
        },
      });
    });

    it('should default order to 999 when not provided', () => {
      const plugin = createMockPlugin('test-plugin', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1' },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].order).toBe(999);
    });

    it('should default visible to true when not provided', () => {
      const plugin = createMockPlugin('test-plugin', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1' },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].visible).toBe(true);
    });

    it('should prefix menu item IDs with plugin ID', () => {
      const plugin = createMockPlugin('my-plugin', [
        { id: 'dashboard', name: 'Dashboard', route: '/dashboard' },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].id).toBe('my-plugin-dashboard');
    });

    it('should prefix parentId with plugin ID when provided', () => {
      const plugin = createMockPlugin('test-plugin', [
        {
          id: 'submenu',
          name: 'Submenu',
          route: '/submenu',
          parentId: 'main-menu',
        },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].parentId).toBe('test-plugin-main-menu');
    });

    it('should leave parentId as undefined when not provided', () => {
      const plugin = createMockPlugin('test-plugin', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1' },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].parentId).toBeUndefined();
    });

    it('should sort menu items by order ascending', () => {
      const plugin = createMockPlugin('test-plugin', [
        { id: 'menu-3', name: 'Menu 3', route: '/menu3', order: 30 },
        { id: 'menu-1', name: 'Menu 1', route: '/menu1', order: 10 },
        { id: 'menu-2', name: 'Menu 2', route: '/menu2', order: 20 },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems).toHaveLength(3);
      expect(menuItems[0].id).toBe('test-plugin-menu-1');
      expect(menuItems[1].id).toBe('test-plugin-menu-2');
      expect(menuItems[2].id).toBe('test-plugin-menu-3');
    });

    it('should sort menu items across multiple plugins', () => {
      const plugin1 = createMockPlugin('plugin-1', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1', order: 50 },
      ]);
      const plugin2 = createMockPlugin('plugin-2', [
        { id: 'menu-2', name: 'Menu 2', route: '/menu2', order: 10 },
      ]);
      const plugin3 = createMockPlugin('plugin-3', [
        { id: 'menu-3', name: 'Menu 3', route: '/menu3', order: 30 },
      ]);

      pluginRegistry.registerPlugin(plugin1, mockAuthContext, mockMessageBus);
      pluginRegistry.registerPlugin(plugin2, mockAuthContext, mockMessageBus);
      pluginRegistry.registerPlugin(plugin3, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems).toHaveLength(3);
      expect(menuItems[0].pluginId).toBe('plugin-2');
      expect(menuItems[1].pluginId).toBe('plugin-3');
      expect(menuItems[2].pluginId).toBe('plugin-1');
    });

    it('should handle badge with string content', () => {
      const plugin = createMockPlugin('test-plugin', [
        {
          id: 'menu-1',
          name: 'Menu 1',
          route: '/menu1',
          badge: { content: 'Beta' },
        },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].badge).toEqual({ content: 'Beta' });
    });

    it('should handle badge with numeric content', () => {
      const plugin = createMockPlugin('test-plugin', [
        {
          id: 'menu-1',
          name: 'Menu 1',
          route: '/menu1',
          badge: { content: 42, color: 'blue' },
        },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].badge).toEqual({ content: 42, color: 'blue' });
    });

    it('should handle plugin with no menu items', () => {
      const plugin = createMockPlugin('test-plugin', []);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems).toEqual([]);
    });

    it('should handle multiple menu items from same plugin', () => {
      const plugin = createMockPlugin('test-plugin', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1', order: 1 },
        { id: 'menu-2', name: 'Menu 2', route: '/menu2', order: 2 },
        { id: 'menu-3', name: 'Menu 3', route: '/menu3', order: 3 },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems).toHaveLength(3);
      expect(menuItems.every(item => item.pluginId === 'test-plugin')).toBe(true);
    });

    it('should handle plugins in different lifecycle states except error', () => {
      const plugin1 = createMockPlugin('plugin-1', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1' },
      ]);
      const plugin2 = createMockPlugin('plugin-2', [
        { id: 'menu-2', name: 'Menu 2', route: '/menu2' },
      ]);
      const plugin3 = createMockPlugin('plugin-3', [
        { id: 'menu-3', name: 'Menu 3', route: '/menu3' },
      ]);

      pluginRegistry.registerPlugin(plugin1, mockAuthContext, mockMessageBus);
      pluginRegistry.registerPlugin(plugin2, mockAuthContext, mockMessageBus);
      pluginRegistry.registerPlugin(plugin3, mockAuthContext, mockMessageBus);

      pluginRegistry.updatePluginState('plugin-1', 'loaded');
      pluginRegistry.updatePluginState('plugin-2', 'mounting');
      // plugin-3 remains in 'not-loaded' state

      const menuItems = generatePluginMenuItems();

      expect(menuItems).toHaveLength(3);
    });

    it('should preserve icon property when provided', () => {
      const plugin = createMockPlugin('test-plugin', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1', icon: 'mdi-account' },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].icon).toBe('mdi-account');
    });

    it('should handle empty string icon', () => {
      const plugin = createMockPlugin('test-plugin', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1', icon: '' },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].icon).toBe('');
    });

    it('should handle order value of 0', () => {
      const plugin = createMockPlugin('test-plugin', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1', order: 0 },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].order).toBe(0);
    });

    it('should handle negative order values', () => {
      const plugin = createMockPlugin('test-plugin', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1', order: -10 },
        { id: 'menu-2', name: 'Menu 2', route: '/menu2', order: 5 },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = generatePluginMenuItems();

      expect(menuItems[0].order).toBe(-10);
      expect(menuItems[1].order).toBe(5);
    });
  });

  describe('shouldUseVirtualScrolling', () => {
    it('should return false for 50 items or less', () => {
      expect(shouldUseVirtualScrolling(0)).toBe(false);
      expect(shouldUseVirtualScrolling(1)).toBe(false);
      expect(shouldUseVirtualScrolling(25)).toBe(false);
      expect(shouldUseVirtualScrolling(50)).toBe(false);
    });

    it('should return true for more than 50 items', () => {
      expect(shouldUseVirtualScrolling(51)).toBe(true);
      expect(shouldUseVirtualScrolling(100)).toBe(true);
      expect(shouldUseVirtualScrolling(1000)).toBe(true);
    });

    it('should handle negative values', () => {
      expect(shouldUseVirtualScrolling(-1)).toBe(false);
      expect(shouldUseVirtualScrolling(-100)).toBe(false);
    });

    it('should handle boundary value', () => {
      expect(shouldUseVirtualScrolling(50)).toBe(false);
      expect(shouldUseVirtualScrolling(51)).toBe(true);
    });
  });

  describe('getMenuItemsForPlugin', () => {
    it('should return empty array when plugin has no menu items', () => {
      const plugin = createMockPlugin('test-plugin', []);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = getMenuItemsForPlugin('test-plugin');

      expect(menuItems).toEqual([]);
    });

    it('should return empty array when plugin does not exist', () => {
      const menuItems = getMenuItemsForPlugin('non-existent-plugin');

      expect(menuItems).toEqual([]);
    });

    it('should return menu items for specific plugin', () => {
      const plugin1 = createMockPlugin('plugin-1', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1' },
        { id: 'menu-2', name: 'Menu 2', route: '/menu2' },
      ]);
      const plugin2 = createMockPlugin('plugin-2', [
        { id: 'menu-3', name: 'Menu 3', route: '/menu3' },
      ]);

      pluginRegistry.registerPlugin(plugin1, mockAuthContext, mockMessageBus);
      pluginRegistry.registerPlugin(plugin2, mockAuthContext, mockMessageBus);

      const menuItems = getMenuItemsForPlugin('plugin-1');

      expect(menuItems).toHaveLength(2);
      expect(menuItems.every(item => item.pluginId === 'plugin-1')).toBe(true);
      expect(menuItems[0].id).toBe('plugin-1-menu-1');
      expect(menuItems[1].id).toBe('plugin-1-menu-2');
    });

    it('should not return menu items from other plugins', () => {
      const plugin1 = createMockPlugin('plugin-1', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1' },
      ]);
      const plugin2 = createMockPlugin('plugin-2', [
        { id: 'menu-2', name: 'Menu 2', route: '/menu2' },
      ]);

      pluginRegistry.registerPlugin(plugin1, mockAuthContext, mockMessageBus);
      pluginRegistry.registerPlugin(plugin2, mockAuthContext, mockMessageBus);

      const menuItems = getMenuItemsForPlugin('plugin-1');

      expect(menuItems).toHaveLength(1);
      expect(menuItems[0].pluginId).toBe('plugin-1');
    });

    it('should return sorted menu items by order', () => {
      const plugin = createMockPlugin('test-plugin', [
        { id: 'menu-3', name: 'Menu 3', route: '/menu3', order: 30 },
        { id: 'menu-1', name: 'Menu 1', route: '/menu1', order: 10 },
        { id: 'menu-2', name: 'Menu 2', route: '/menu2', order: 20 },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = getMenuItemsForPlugin('test-plugin');

      expect(menuItems).toHaveLength(3);
      expect(menuItems[0].order).toBe(10);
      expect(menuItems[1].order).toBe(20);
      expect(menuItems[2].order).toBe(30);
    });

    it('should exclude menu items from plugins in error state', () => {
      const plugin1 = createMockPlugin('plugin-1', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1' },
      ]);
      const plugin2 = createMockPlugin('plugin-2', [
        { id: 'menu-2', name: 'Menu 2', route: '/menu2' },
      ]);

      pluginRegistry.registerPlugin(plugin1, mockAuthContext, mockMessageBus);
      pluginRegistry.registerPlugin(plugin2, mockAuthContext, mockMessageBus);

      // Set plugin-1 to error state
      pluginRegistry.setPluginError('plugin-1', new Error('Test error'), false);

      const menuItems = getMenuItemsForPlugin('plugin-1');

      expect(menuItems).toEqual([]);
    });

    it('should return all properties of menu items', () => {
      const plugin = createMockPlugin('test-plugin', [
        {
          id: 'menu-1',
          name: 'Test Menu',
          route: '/test',
          icon: 'mdi-test',
          order: 5,
          parentId: 'parent',
          visible: false,
          badge: { content: 10, color: 'green' },
        },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = getMenuItemsForPlugin('test-plugin');

      expect(menuItems[0]).toEqual({
        id: 'test-plugin-menu-1',
        pluginId: 'test-plugin',
        name: 'Test Menu',
        route: '/test',
        icon: 'mdi-test',
        order: 5,
        parentId: 'test-plugin-parent',
        visible: false,
        badge: { content: 10, color: 'green' },
      });
    });

    it('should handle plugin with single menu item', () => {
      const plugin = createMockPlugin('test-plugin', [
        { id: 'menu-1', name: 'Menu 1', route: '/menu1' },
      ]);

      pluginRegistry.registerPlugin(plugin, mockAuthContext, mockMessageBus);

      const menuItems = getMenuItemsForPlugin('test-plugin');

      expect(menuItems).toHaveLength(1);
      expect(menuItems[0].pluginId).toBe('test-plugin');
    });
  });
});
