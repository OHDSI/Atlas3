import { computed, onScopeDispose, ref, type ComputedRef } from 'vue'
import { pluginRegistry } from '@/plugins/core/PluginRegistry'
import { getMountItems, type ResolvedMountItem } from '@/plugins/navigation/PluginMountPoints'
import { usePermissions } from '@/composables/usePermissions'
import type { PluginMountSurface } from '@/models/PluginModels'

export interface UsePluginMountsReturn {
  items: ComputedRef<ResolvedMountItem[]>
}

export function usePluginMounts(surface: PluginMountSurface): UsePluginMountsReturn {
  const { hasAnyPermission } = usePermissions()

  // The registry is a plain class, so nothing about it is reactive. Bump a
  // counter on registration changes to invalidate the computed.
  const version = ref(0)
  const unsubscribe = pluginRegistry.onPluginChange(() => {
    version.value += 1
  })
  onScopeDispose(unsubscribe)

  const items = computed<ResolvedMountItem[]>(() => {
    void version.value
    return getMountItems(surface, hasAnyPermission)
  })

  return { items }
}
