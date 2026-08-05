import { pluginRegistry } from '../core/PluginRegistry'
import type { PluginMountPoint, PluginMountSurface } from '@/models/PluginModels'
import { logger } from '@/utils/logger'

export interface ResolvedMountItem {
  key: string
  pluginId: string
  itemId: string
  surface: PluginMountSurface
  name: string
  icon?: string
  path?: string
  group?: string
  hint?: string
  order: number
  insertBefore?: string
  insertAfter?: string
  visible: boolean
}

export function mountKey(pluginId: string, itemId: string): string {
  return `plugin:${pluginId}:${itemId}`
}

function toResolved(pluginId: string, point: PluginMountPoint): ResolvedMountItem {
  return {
    key: mountKey(pluginId, point.id),
    pluginId,
    itemId: point.id,
    surface: point.surface,
    name: point.name,
    icon: point.icon,
    path: point.path,
    group: point.group,
    hint: point.hint,
    order: point.order ?? 999,
    insertBefore: point.insertBefore,
    insertAfter: point.insertAfter,
    visible: point.visible ?? true,
  }
}

export function getMountItems(
  surface: PluginMountSurface,
  hasAnyPermission: (permissions: string[]) => boolean = () => true,
  options: { includeHidden?: boolean } = {}
): ResolvedMountItem[] {
  const byKey = new Map<string, ResolvedMountItem>()

  for (const plugin of pluginRegistry.getAllPlugins()) {
    if (plugin.state === 'error') continue

    const { id: pluginId, mountPoints, menuItems } = plugin.registration

    const declared: PluginMountPoint[] = [...(mountPoints ?? [])]

    if (surface === 'main-nav') {
      for (const item of menuItems ?? []) {
        declared.push({
          id: item.id,
          surface: 'main-nav',
          name: item.name,
          icon: item.icon,
          path: item.route,
          order: item.order,
          insertBefore: item.insertBefore,
          insertAfter: item.insertAfter,
          visible: item.visible,
        })
      }
    }

    for (const point of declared) {
      if (point.surface !== surface) continue
      if (!options.includeHidden && point.visible === false) continue
      if (point.requiredPermissions?.length && !hasAnyPermission(point.requiredPermissions)) {
        continue
      }
      const resolved = toResolved(pluginId, point)
      if (byKey.has(resolved.key)) {
        logger.warn(
          'PluginMountPoints',
          `Duplicate mount point id "${point.id}" on surface "${surface}" for plugin ${pluginId}; last one wins`
        )
      }
      byKey.set(resolved.key, resolved)
    }
  }

  return Array.from(byKey.values()).sort((a, b) => a.order - b.order)
}
