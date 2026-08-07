<template>
  <div class="plugin-error-ui">
    <AtlasIcon
      size="64"
      color="error"
    >
      mdi-alert-circle
    </AtlasIcon>
    <h2>Plugin Failed to Load</h2>
    <p class="error-message">
      {{ error?.message || 'Unknown error occurred' }}
    </p>
    <div
      v-if="showDetails"
      class="error-details"
    >
      <p><strong>Plugin ID:</strong> {{ pluginId }}</p>
      <p><strong>Timestamp:</strong> {{ formatTimestamp(error?.timestamp) }}</p>
      <pre v-if="error?.stack">{{ error.stack }}</pre>
    </div>
    <div class="actions">
      <AtlasButton
        v-if="error?.recoverable"
        @click="$emit('retry')"
      >
        Retry
      </AtlasButton>
      <AtlasButton
        variant="ghost"
        @click="showDetails = !showDetails"
      >
        {{ showDetails ? 'Hide' : 'Show' }} Details
      </AtlasButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasIcon } from '@/components/ui'
import { ref } from 'vue'

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

const showDetails = ref(false)

function formatTimestamp(timestamp?: Date): string {
  if (!timestamp) return 'N/A'
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
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.v-theme--dark .error-details {
  background: var(--atlas-color-surface-variant);
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
