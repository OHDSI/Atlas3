import { ref, readonly } from 'vue'

const openPluginId = ref<string | null>(null)

export function usePluginOverlay() {
  return {
    openPluginId: readonly(openPluginId),
    open(pluginId: string) {
      openPluginId.value = pluginId
    },
    close() {
      openPluginId.value = null
    },
    toggle(pluginId: string) {
      openPluginId.value = openPluginId.value === pluginId ? null : pluginId
    },
  }
}
