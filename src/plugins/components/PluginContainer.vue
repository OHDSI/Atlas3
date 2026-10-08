<template>
  <div class="plugin-container">
    <div
      :id="pluginContainerId"
      class="plugin-mount-point"
      :class="{ 'plugin-mount-point--hidden': hasError || isLoading }"
    />
    <div
      v-if="hasError"
      class="plugin-error plugin-overlay"
    >
      <PluginErrorUI
        :error="error"
        :plugin-id="pluginId"
        @retry="handleRetry"
      />
    </div>
    <div
      v-else-if="isLoading"
      class="plugin-loading plugin-overlay"
    >
      <PluginLoadingState />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, onErrorCaptured } from 'vue'
import { useRoute } from 'vue-router'
import { pluginRegistry, whenPluginFrameworkReady } from '@/plugins/index'
import { logger } from '@/utils/logger'
import PluginErrorUI from './PluginErrorUI.vue'
import PluginLoadingState from './PluginLoadingState.vue'

const route = useRoute()
const pluginId = computed(() => route.params.pluginId as string)
const pluginContainerId = computed(() => `plugin-${pluginId.value}`)

const hasError = ref(false)
const error = ref<{
  message: string
  stack?: string
  timestamp: Date
  recoverable: boolean
} | null>(null)
const isLoading = ref(true)

let stateUnsubscribe: (() => void) | null = null
let lookupId = 0

function detach() {
  lookupId++
  if (stateUnsubscribe) {
    stateUnsubscribe()
    stateUnsubscribe = null
  }
}

// Wait until the plugin is registered or the framework has finished
// registering everything, whichever comes first.
function waitForRegistration(id: string): Promise<void> {
  return new Promise(resolve => {
    const unsubscribe = pluginRegistry.onPluginChange((changeType, changedId) => {
      if (changeType === 'added' && changedId === id) done()
    })
    function done() {
      unsubscribe()
      resolve()
    }
    whenPluginFrameworkReady().then(done)
  })
}

async function attach(id: string) {
  detach()
  const currentLookup = lookupId

  hasError.value = false
  error.value = null
  isLoading.value = true

  if (!pluginRegistry.getPlugin(id)) {
    await waitForRegistration(id)
    if (currentLookup !== lookupId) return
  }

  const plugin = pluginRegistry.getPlugin(id)
  if (!plugin) {
    logger.error('PluginContainer', `Plugin ${id} not found`)
    hasError.value = true
    isLoading.value = false
    error.value = {
      message: `Plugin ${id} not found`,
      timestamp: new Date(),
      recoverable: false,
    }
    return
  }

  error.value = plugin.error ?? null
  stateUnsubscribe = pluginRegistry.onStateChange(id, state => {
    hasError.value = state === 'error'
    isLoading.value = state === 'loading' || state === 'not-loaded'

    if (state === 'error') {
      error.value = pluginRegistry.getPlugin(id)?.error ?? null
    }
  })
}

onMounted(() => {
  if (pluginId.value) attach(pluginId.value)
})

watch(pluginId, (id, previousId) => {
  if (id && id !== previousId) attach(id)
})

onUnmounted(detach)

onErrorCaptured(err => {
  logger.error('PluginContainer', `Error captured for plugin ${pluginId.value}`, err)
  hasError.value = true
  error.value = {
    message: err.message,
    stack: err.stack,
    timestamp: new Date(),
    recoverable: true,
  }
  return false // Prevent error propagation
})

function handleRetry() {
  hasError.value = false
  error.value = null

  if (window.__pluginLoader) {
    window.__pluginLoader.retryPlugin(pluginId.value)
  }
}
</script>

<style scoped>
.plugin-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.plugin-mount-point {
  width: 100%;
  height: 100%;
}

.plugin-mount-point--hidden {
  visibility: hidden;
  position: absolute;
  top: 0;
  left: 0;
}

.plugin-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: var(--background-color, var(--atlas-color-surface));
  z-index: 10;
}
</style>
