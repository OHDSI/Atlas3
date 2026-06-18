<script setup lang="ts">
import { ref, watch, onUnmounted, useTemplateRef } from 'vue'
import { usePluginOverlay } from '@/plugins/host/pluginOverlayState'
import { mountPluginParcel } from '@/plugins/host/parcelLoader'
import { logger } from '@/utils/logger'

const overlay = usePluginOverlay()
const containerRef = useTemplateRef<HTMLDivElement>('containerRef')
const mountedPluginId = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

let parcel: { unmount(): Promise<unknown> } | null = null

async function mount(pluginId: string) {
  if (!containerRef.value) return
  loading.value = true
  error.value = null
  try {
    parcel = await mountPluginParcel(pluginId, containerRef.value)
    mountedPluginId.value = pluginId
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    logger.error('PluginOverlayHost', `Failed to mount plugin ${pluginId}`, err)
  } finally {
    loading.value = false
  }
}

async function unmount() {
  if (parcel) {
    try {
      await parcel.unmount()
    } catch (err) {
      logger.warn('PluginOverlayHost', 'Error during parcel unmount', err)
    }
    parcel = null
  }
  mountedPluginId.value = null
}

watch(
  () => overlay.openPluginId.value,
  async newId => {
    if (newId === mountedPluginId.value) return
    await unmount()
    if (newId) await mount(newId)
  }
)

function handleEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && overlay.openPluginId.value) {
    overlay.close()
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleEsc)
  onUnmounted(() => window.removeEventListener('keydown', handleEsc))
}

onUnmounted(unmount)
</script>

<template>
  <Teleport to="body">
    <button
      v-if="overlay.openPluginId.value"
      type="button"
      class="plugin-overlay-backdrop"
      data-testid="plugin-overlay-backdrop"
      aria-label="Close plugin"
      @click="overlay.close()"
    />
    <div
      v-show="overlay.openPluginId.value"
      class="plugin-overlay-panel"
      role="dialog"
      :aria-hidden="!overlay.openPluginId.value"
      data-testid="plugin-overlay-panel"
      @click.stop
    >
      <div
        v-if="loading"
        class="plugin-overlay-status"
      >
        Loading…
      </div>
      <div
        v-if="error"
        class="plugin-overlay-status plugin-overlay-error"
      >
        {{ error }}
      </div>
      <div
        ref="containerRef"
        class="plugin-overlay-mount"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.plugin-overlay-backdrop {
  position: fixed;
  inset: 0;
  background: transparent;
  /* Above the FAB (z-index 2000) so the open panel sits on top of it. */
  z-index: 2001;
  /* Reset native button chrome — this is a click-to-close overlay,
     rendered as a <button> only for a11y (keyboard activation + role). */
  border: 0;
  padding: 0;
  cursor: pointer;
}
.plugin-overlay-panel {
  position: fixed;
  /* Overlap the FAB and render above it (z-index) rather than stacking
     above it on the y-axis. The panel covers the button while open; it's
     dismissed via the backdrop or Esc. */
  bottom: 24px;
  right: 24px;
  width: min(420px, calc(100vw - 48px));
  height: min(640px, calc(100vh - 48px));
  background: rgb(var(--v-theme-background));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  z-index: 2002;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.plugin-overlay-mount {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
}
.plugin-overlay-mount > :first-child {
  flex: 1;
  min-height: 0;
}
.plugin-overlay-status {
  padding: 12px 16px;
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
}
.plugin-overlay-error {
  color: rgb(var(--v-theme-error));
}
</style>
