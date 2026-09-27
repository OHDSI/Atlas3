<template>
  <div class="plugin-parcel-outlet">
    <div
      ref="mountEl"
      class="plugin-parcel-outlet__mount"
      :class="{ 'plugin-parcel-outlet__mount--hidden': hasError || isLoading }"
    />
    <div
      v-if="hasError"
      data-testid="plugin-outlet-error"
    >
      <PluginErrorUI
        :error="error"
        :plugin-id="pluginId"
        @retry="handleRetry"
      />
    </div>
    <PluginLoadingState v-else-if="isLoading" />
  </div>
</template>

<script lang="ts">
let hostSequence = 0
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useLocaleStore } from '@/stores/locale'
import { mountPluginParcel, type ParcelHandle } from '@/plugins/host/parcelLoader'
import type { PluginHostContext, PluginMountSurface } from '@/models/PluginModels'
import { logger } from '@/utils/logger'
import PluginErrorUI from './PluginErrorUI.vue'
import PluginLoadingState from './PluginLoadingState.vue'

const props = defineProps<{
  pluginId: string
  itemId: string
  surface: PluginMountSurface
  sourceKey?: string
}>()

const mountEl = ref<HTMLElement | null>(null)
const isLoading = ref(true)
const hasError = ref(false)
const error = ref<{
  message: string
  stack?: string
  timestamp: Date
  recoverable: boolean
} | null>(null)

const authStore = useAuthStore()
const localeStore = useLocaleStore()
const { locale } = storeToRefs(localeStore)

const hostContext = computed<PluginHostContext>(() => ({
  surface: props.surface,
  itemId: props.itemId,
  locale: locale.value,
  permissions: Object.values(authStore.permissions ?? {}).flat(),
  sourceKey: props.sourceKey,
}))

interface ActiveParcel {
  pluginId: string
  handle: ParcelHandle
  host: HTMLElement
  context: PluginHostContext
}

let active: ActiveParcel | null = null
let mountToken = 0
// single-spa refuses lifecycle calls that overlap (an unmount issued while an
// update is in flight is a silent no-op), so every parcel operation for this
// outlet is serialized, mirroring single-spa-vue's <Parcel> component.
let queue: Promise<void> = Promise.resolve()

function enqueue(task: () => Promise<void>): Promise<void> {
  queue = queue.then(task).catch(err => {
    logger.error('PluginParcelOutlet', 'Parcel lifecycle task failed', err)
  })
  return queue
}

// single-spa-vue mounts into `#<host id> .single-spa-container` and clears the
// whole host on unmount, so parcels must never share a host element.
function createHost(): HTMLElement {
  const host = document.createElement('div')
  host.id = `plugin-parcel-outlet-host-${++hostSequence}`
  host.className = 'plugin-parcel-outlet__host'
  mountEl.value!.appendChild(host)
  return host
}

async function safeUnmount(pluginId: string, handle: ParcelHandle, host: HTMLElement) {
  try {
    await handle.unmount()
  } catch (err) {
    logger.error('PluginParcelOutlet', `Failed to unmount ${pluginId}`, err)
  }
  host.remove()
}

function mountParcel(): Promise<void> {
  const token = ++mountToken
  isLoading.value = true
  hasError.value = false
  error.value = null
  return enqueue(async () => {
    if (token !== mountToken || !mountEl.value) return
    const pluginId = props.pluginId
    const context = hostContext.value
    const host = createHost()
    let handle: ParcelHandle | undefined
    try {
      handle = await mountPluginParcel(pluginId, host, { hostContext: context })
      await handle.mountPromise
      active = { pluginId, handle, host, context }
      if (token === mountToken) isLoading.value = false
    } catch (err) {
      if (handle) await safeUnmount(pluginId, handle, host)
      else host.remove()
      if (token !== mountToken) return
      const e = err as Error
      hasError.value = true
      isLoading.value = false
      error.value = {
        message: e.message,
        stack: e.stack,
        timestamp: new Date(),
        recoverable: true,
      }
      logger.error('PluginParcelOutlet', `Failed to mount ${pluginId}`, err)
    }
  })
}

function unmountParcel(): Promise<void> {
  return enqueue(async () => {
    if (!active) return
    const { pluginId, handle, host } = active
    active = null
    await safeUnmount(pluginId, handle, host)
  })
}

function updateParcel(): Promise<void> {
  return enqueue(async () => {
    const target = active
    if (!target?.handle.update || target.pluginId !== props.pluginId) return
    const next = hostContext.value
    if (next === target.context) return
    target.context = next
    try {
      await target.handle.update({ hostContext: next })
    } catch (err) {
      logger.error('PluginParcelOutlet', `Failed to update ${target.pluginId}`, err)
    }
  })
}

function handleRetry(): Promise<void> {
  unmountParcel()
  return mountParcel()
}

onMounted(mountParcel)
onBeforeUnmount(() => {
  mountToken++
  unmountParcel()
})

watch(hostContext, updateParcel)

watch(
  () => props.pluginId,
  () => {
    unmountParcel()
    mountParcel()
  }
)
</script>

<style scoped>
.plugin-parcel-outlet {
  position: relative;
  min-height: 200px;
}

.plugin-parcel-outlet__mount--hidden {
  display: none;
}
</style>
