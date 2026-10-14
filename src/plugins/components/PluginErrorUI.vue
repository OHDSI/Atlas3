<template>
  <div class="plugin-error-ui">
    <AtlasIcon
      size="64"
      color="error"
    >
      mdi-alert-circle
    </AtlasIcon>
    <h2>{{ tv('plugins.error.title') }}</h2>
    <p class="error-message">
      {{ error?.message || tv('plugins.error.unknown') }}
    </p>
    <div
      v-if="showDetails"
      class="error-details"
    >
      <p><strong>{{ tv('plugins.error.pluginId') }}</strong> {{ pluginId }}</p>
      <p><strong>{{ tv('plugins.error.timestamp') }}</strong> {{ formatTimestamp(error?.timestamp) }}</p>
      <pre v-if="error?.stack">{{ error.stack }}</pre>
    </div>
    <div class="actions">
      <AtlasButton
        v-if="error?.recoverable"
        @click="$emit('retry')"
      >
        {{ tv('common.retry') }}
      </AtlasButton>
      <AtlasButton
        variant="ghost"
        @click="showDetails = !showDetails"
      >
        {{ showDetails ? tv('plugins.error.hideDetails') : tv('plugins.error.showDetails') }}
      </AtlasButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasIcon } from '@/components/ui'
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'

defineProps<{
  error: {
    message: string
    stack?: string
    timestamp?: Date
    recoverable?: boolean
  } | null
  pluginId: string
}>()

defineEmits<{
  retry: []
}>()

const { tv } = useI18n()

const showDetails = ref(false)

function formatTimestamp(timestamp?: Date): string {
  if (!timestamp) return tv('common.notAvailable')
  return new Date(timestamp).toLocaleString()
}
</script>

<style scoped>
.plugin-error-ui {
  padding: 2rem;
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.error-message {
  color: #c62828;
  font-weight: 500;
  margin: 1rem 0;
}

.v-theme--dark .error-message {
  color: var(--atlas-color-danger-text);
}

.error-details {
  text-align: left;
  background: var(--atlas-color-surface-variant);
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.error-details pre {
  overflow-x: auto;
  font-size: 0.75rem;
  max-height: 200px;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;
}
</style>
