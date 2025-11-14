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
import PluginErrorUI from './PluginErrorUI.vue';

const route = useRoute();
const pluginId = computed(() => route.params.pluginId as string);
const pluginContainerId = computed(() => `plugin-${pluginId.value}`);

const hasError = ref(false);
const error = ref<any>(null);

let stateUnsubscribe: (() => void) | null = null;

onMounted(() => {
  const plugin = pluginRegistry.getPlugin(pluginId.value);
  if (plugin) {
    console.log(`[PluginContainer] Mounting container for plugin ${pluginId.value}, state:`, plugin.state);
    
    hasError.value = plugin.state === 'error';
    error.value = plugin.error;

    // Subscribe to state changes to catch errors
    stateUnsubscribe = pluginRegistry.onStateChange(pluginId.value, (state) => {
      console.log(`[PluginContainer] Plugin ${pluginId.value} state changed to:`, state);
      
      hasError.value = state === 'error';
      
      if (state === 'error') {
        const p = pluginRegistry.getPlugin(pluginId.value);
        error.value = p?.error;
      }
    });
  } else {
    console.error(`[PluginContainer] Plugin ${pluginId.value} not found in registry`);
    hasError.value = true;
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
  console.error(`[PluginContainer] Error captured for plugin ${pluginId.value}:`, err);
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
  
  const loader = (window as any).__pluginLoader;
  if (loader) {
    loader.retryPlugin(pluginId.value);
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
