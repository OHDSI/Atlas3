<template>
  <div class="plugin-container">
    <div
      v-if="hasError"
      class="plugin-error"
    >
      <PluginErrorUI
        :error="error"
        :plugin-id="pluginId"
        @retry="handleRetry"
      />
    </div>
    <div
      v-else-if="isLoading"
      class="plugin-loading"
    >
      <PluginLoadingState />
    </div>
    <div
      v-else
      :id="pluginContainerId"
      class="plugin-mount-point"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onErrorCaptured } from 'vue';
import { useRoute } from 'vue-router';
import { pluginRegistry } from '@/plugins/index';
import { logger } from '@/utils/logger';
import PluginErrorUI from './PluginErrorUI.vue';
import PluginLoadingState from './PluginLoadingState.vue';

const route = useRoute();
const pluginId = computed(() => route.params.pluginId as string);
const pluginContainerId = computed(() => `plugin-${pluginId.value}`);

const hasError = ref(false);
const error = ref<any>(null);
const isLoading = ref(true);

let stateUnsubscribe: (() => void) | null = null;

onMounted(() => {
  const plugin = pluginRegistry.getPlugin(pluginId.value);
  if (plugin) {
    logger.debug('PluginContainer', `Mounting container for plugin ${pluginId.value}`, plugin.state);

    hasError.value = plugin.state === 'error';
    error.value = plugin.error;
    isLoading.value = plugin.state === 'loading' || plugin.state === 'not-loaded';

    // Subscribe to state changes
    stateUnsubscribe = pluginRegistry.onStateChange(pluginId.value, (state) => {
      logger.debug('PluginContainer', `Plugin ${pluginId.value} state changed to`, state);

      hasError.value = state === 'error';
      isLoading.value = state === 'loading' || state === 'not-loaded';

      if (state === 'error') {
        const p = pluginRegistry.getPlugin(pluginId.value);
        error.value = p?.error;
      }
    });
  } else {
    logger.error('PluginContainer', `Plugin ${pluginId.value} not found in registry`);
    hasError.value = true;
    isLoading.value = false;
    error.value = {
      message: `Plugin ${pluginId.value} not found`,
      timestamp: new Date(),
      recoverable: false,
    };
  }
});

onUnmounted(() => {
  if (stateUnsubscribe) {
    stateUnsubscribe();
  }
});

onErrorCaptured((err) => {
  logger.error('PluginContainer', `Error captured for plugin ${pluginId.value}`, err);
  hasError.value = true;
  error.value = {
    message: err.message,
    stack: err.stack,
    timestamp: new Date(),
    recoverable: true,
  };
  return false; // Prevent error propagation
});

function handleRetry() {
  hasError.value = false;
  error.value = null;

  if (window.__pluginLoader) {
    window.__pluginLoader.retryPlugin(pluginId.value);
  }
}
</script>

<style scoped>
.plugin-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.plugin-loading,
.plugin-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.plugin-mount-point {
  width: 100%;
  height: 100%;
}
</style>
