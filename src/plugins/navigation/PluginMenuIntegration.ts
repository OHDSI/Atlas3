import { pluginRegistry } from '../core/PluginRegistry';

export interface PluginMenuItem {
  id: string;
  pluginId: string;
  name: string;
  route: string;
  icon?: string;
  order: number;
  parentId?: string;
  visible: boolean;
  badge?: {
    content: string | number;
    color?: string;
  };
}

export function generatePluginMenuItems(): PluginMenuItem[] {
  const plugins = pluginRegistry.getAllPlugins();
  const menuItems: PluginMenuItem[] = [];

  for (const plugin of plugins) {
    // Skip plugins in error state
    if (plugin.state === 'error') continue;

    for (const menuItem of plugin.registration.menuItems) {
      menuItems.push({
        id: `${plugin.registration.id}-${menuItem.id}`,
        pluginId: plugin.registration.id,
        name: menuItem.name,
        route: menuItem.route,
        icon: menuItem.icon,
        order: menuItem.order ?? 999,
        parentId: menuItem.parentId ? `${plugin.registration.id}-${menuItem.parentId}` : undefined,
        visible: menuItem.visible ?? true,
        badge: menuItem.badge,
      });
    }
  }

  // Sort by order
  menuItems.sort((a, b) => a.order - b.order);

  return menuItems;
}

export function shouldUseVirtualScrolling(itemCount: number): boolean {
  return itemCount > 50;
}

export function getMenuItemsForPlugin(pluginId: string): PluginMenuItem[] {
  return generatePluginMenuItems().filter(item => item.pluginId === pluginId);
}
