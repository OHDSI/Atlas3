<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef } from 'vue'
import { pluginRegistry, type RegisteredFab } from '@/plugins/core/PluginRegistry'
import { usePluginOverlay } from '@/plugins/host/pluginOverlayState'

const props = defineProps<{ mountId: string }>()

const overlay = usePluginOverlay()

// `pluginRegistry` is a plain Map, not Vue-reactive. Drive a shallowRef from
// its onPluginChange events instead of relying on a computed.
const fabs = shallowRef<RegisteredFab[]>([])

function refresh() {
  fabs.value = pluginRegistry.getFabPlugins(props.mountId)
}

let unsubscribe: (() => void) | null = null
onMounted(() => {
  refresh()
  unsubscribe = pluginRegistry.onPluginChange(refresh)
})
onUnmounted(() => {
  unsubscribe?.()
})

function positionStyle(position: string | undefined): Record<string, string> {
  switch (position) {
    case 'bottom-left':
      return { bottom: '24px', left: '24px' }
    case 'top-right':
      return { top: '24px', right: '24px' }
    case 'top-left':
      return { top: '24px', left: '24px' }
    case 'bottom-right':
    default:
      return { bottom: '24px', right: '24px' }
  }
}
</script>

<template>
  <Teleport to="body">
    <v-btn
      v-for="entry in fabs"
      :key="entry.pluginId"
      :icon="entry.fab.icon"
      :color="entry.fab.color || 'primary'"
      :aria-label="entry.fab.label"
      :title="entry.fab.label"
      :data-testid="`plugin-fab-${entry.pluginId}`"
      size="large"
      elevation="6"
      :style="{
        position: 'fixed',
        zIndex: 2000,
        width: '56px',
        height: '56px',
        borderRadius: '28px',
        ...positionStyle(entry.fab.position),
      }"
      @click="overlay.toggle(entry.pluginId)"
    />
  </Teleport>
</template>
