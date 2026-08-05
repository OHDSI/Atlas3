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
  permissions: Object.keys(authStore.permissions ?? {}),
  sourceKey: props.sourceKey,
}))

let parcel: ParcelHandle | null = null

async function mountParcel() {
  if (!mountEl.value) return
  isLoading.value = true
  hasError.value = false
  error.value = null
  try {
    parcel = await mountPluginParcel(props.pluginId, mountEl.value, {
      hostContext: hostContext.value,
    })
    await parcel.mountPromise
    isLoading.value = false
  } catch (err) {
    const e = err as Error
    hasError.value = true
    isLoading.value = false
    error.value = {
      message: e.message,
      stack: e.stack,
      timestamp: new Date(),
      recoverable: true,
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

function handleRetry() {
  void mountParcel()
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
