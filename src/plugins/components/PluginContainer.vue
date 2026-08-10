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
import { ref, computed, onMounted, onUnmounted, onErrorCaptured } from 'vue'
import { useRoute } from 'vue-router'
import { pluginRegistry } from '@/plugins/index'
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

onMounted(async () => {
  const maxAttempts = 20
  const delayMs = 100
  let plugin = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    plugin = pluginRegistry.getPlugin(pluginId.value)
    if (plugin) {
      break
    }
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }

  if (plugin) {
    hasError.value = plugin.state === 'error'
    error.value = plugin.error ?? null
    isLoading.value = plugin.state === 'loading' || plugin.state === 'not-loaded'

    stateUnsubscribe = pluginRegistry.onStateChange(pluginId.value, state => {
      hasError.value = state === 'error'
      isLoading.value = state === 'loading' || state === 'not-loaded'

      if (state === 'error') {
        const p = pluginRegistry.getPlugin(pluginId.value)
        error.value = p?.error ?? null
      }
    })
  } else {
    logger.error('PluginContainer', `Plugin ${pluginId.value} not found`)
    hasError.value = true
    isLoading.value = false
    error.value = {
      message: `Plugin ${pluginId.value} not found`,
      timestamp: new Date(),
      recoverable: false,
    }
  }
})

onUnmounted(() => {
  if (stateUnsubscribe) {
    stateUnsubscribe()
  }
})

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
