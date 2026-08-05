import { pluginRegistry } from '../core/PluginRegistry'
import { getMountItems } from './PluginMountPoints'
import type { MenuItemConfiguration } from '@/models/PluginModels'

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
  const badges = new Map<string, MenuItemConfiguration['badge']>()
  const parentIds = new Map<string, string>()
  for (const plugin of pluginRegistry.getAllPlugins()) {
    for (const item of plugin.registration.menuItems ?? []) {
      const key = `${plugin.registration.id}:${item.id}`
      if (item.badge) badges.set(key, item.badge)
      if (item.parentId) parentIds.set(key, `${plugin.registration.id}-${item.parentId}`)
    }
  }

  return getMountItems('main-nav', undefined, { includeHidden: true }).map(item => ({
    id: `${item.pluginId}-${item.itemId}`,
    pluginId: item.pluginId,
    name: item.name,
    route: item.path ?? '',
    icon: item.icon,
    order: item.order,
    parentId: parentIds.get(`${item.pluginId}:${item.itemId}`),
    insertBefore: item.insertBefore,
    insertAfter: item.insertAfter,
    visible: item.visible,
    badge: badges.get(`${item.pluginId}:${item.itemId}`),
  }))
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
