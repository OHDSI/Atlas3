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

let parcel: ParcelHandle | null = null
let mountToken = 0

async function mountParcel() {
  if (!mountEl.value) return
  // Guards against pluginId changing again before this call's mountPluginParcel
  // resolves: only the invocation matching the latest token may become `parcel`.
  const token = ++mountToken
  isLoading.value = true
  hasError.value = false
  error.value = null
  const contextAtMount = hostContext.value
  try {
    const handle = await mountPluginParcel(props.pluginId, mountEl.value, {
      hostContext: contextAtMount,
    })
    if (token !== mountToken) {
      try {
        await handle.unmount()
      } catch (err) {
        logger.error(
          'PluginParcelOutlet',
          `Failed to unmount superseded parcel for ${props.pluginId}`,
          err
        )
      }
      return
    }
    parcel = handle
    await parcel.mountPromise
    isLoading.value = false
    if (parcel.update && hostContext.value !== contextAtMount) {
      try {
        await parcel.update({ hostContext: hostContext.value })
      } catch (err) {
        logger.error('PluginParcelOutlet', `Failed to update ${props.pluginId}`, err)
      }
    }
  } catch (err) {
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
    if (parcel) {
      const failed = parcel
      parcel = null
      try {
        await failed.unmount()
      } catch (err2) {
        logger.error('PluginParcelOutlet', `Failed to unmount ${props.pluginId}`, err2)
      }
    }
    logger.error('PluginParcelOutlet', `Failed to mount ${props.pluginId}`, err)
  }
}

async function unmountParcel() {
  if (!parcel) return
  try {
    await parcel.unmount()
  } catch (err) {
    logger.error('PluginParcelOutlet', `Failed to unmount ${props.pluginId}`, err)
  }
  parcel = null
}

async function handleRetry() {
  await unmountParcel()
  await mountParcel()
}

onMounted(mountParcel)
onBeforeUnmount(unmountParcel)

watch(hostContext, async next => {
  if (!parcel?.update) return
  try {
    await parcel.update({ hostContext: next })
  } catch (err) {
    logger.error('PluginParcelOutlet', `Failed to update ${props.pluginId}`, err)
  }
})

watch(
  () => props.pluginId,
  async () => {
    await unmountParcel()
    await mountParcel()
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
