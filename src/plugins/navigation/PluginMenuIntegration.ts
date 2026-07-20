import { pluginRegistry } from '../core/PluginRegistry'

export interface PluginMenuItem {
  id: string
  pluginId: string
  name: string
  route: string
  icon?: string
  order: number
  parentId?: string
  insertBefore?: string
  insertAfter?: string
  visible: boolean
  badge?: {
    content: string | number
    color?: string
  }
}

export function generatePluginMenuItems(): PluginMenuItem[] {
  const plugins = pluginRegistry.getAllPlugins()
  const menuItems: PluginMenuItem[] = []

  for (const plugin of plugins) {
    // Skip plugins in error state
    if (plugin.state === 'error') continue

    for (const menuItem of plugin.registration.menuItems) {
      menuItems.push({
        id: `${plugin.registration.id}-${menuItem.id}`,
        pluginId: plugin.registration.id,
        name: menuItem.name,
        route: menuItem.route,
        icon: menuItem.icon,
        order: menuItem.order ?? 999,
        parentId: menuItem.parentId ? `${plugin.registration.id}-${menuItem.parentId}` : undefined,
        insertBefore: menuItem.insertBefore,
        insertAfter: menuItem.insertAfter,
        visible: menuItem.visible ?? true,
        badge: menuItem.badge,
      })
    }
  }

  // Sort by order
  menuItems.sort((a, b) => a.order - b.order)

  return menuItems
}

export function shouldUseVirtualScrolling(itemCount: number): boolean {
  return itemCount > 50
}

export function getMenuItemsForPlugin(pluginId: string): PluginMenuItem[] {
  return generatePluginMenuItems().filter(item => item.pluginId === pluginId)
}

export function interleaveMenuItems<T extends { id: string }>(
  coreItems: T[],
  pluginItems: PluginMenuItem[],
  toItem: (item: PluginMenuItem) => T
): T[] {
  const coreIds = new Set(coreItems.map((c) => c.id))
  const before = new Map<string, PluginMenuItem[]>()
  const after = new Map<string, PluginMenuItem[]>()
  const unanchored: PluginMenuItem[] = []

  for (const item of pluginItems) {
    if (item.insertBefore && coreIds.has(item.insertBefore)) {
      before.set(item.insertBefore, [...(before.get(item.insertBefore) ?? []), item])
    } else if (item.insertAfter && coreIds.has(item.insertAfter)) {
      after.set(item.insertAfter, [...(after.get(item.insertAfter) ?? []), item])
    } else {
      unanchored.push(item)
    }
  }

  const result: T[] = []
  for (const core of coreItems) {
    for (const p of before.get(core.id) ?? []) result.push(toItem(p))
    result.push(core)
    for (const p of after.get(core.id) ?? []) result.push(toItem(p))
  }
  for (const p of unanchored) result.push(toItem(p))
  return result
}
