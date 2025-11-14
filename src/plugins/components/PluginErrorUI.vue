<template>
  <div class="plugin-error-ui">
    <v-icon
      size="64"
      color="error"
    >
      mdi-alert-circle
    </v-icon>
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
      <v-btn 
        v-if="error?.recoverable" 
        color="primary" 
        @click="$emit('retry')"
      >
        Retry
      </v-btn>
      <v-btn 
        variant="text" 
        @click="showDetails = !showDetails"
      >
        {{ showDetails ? 'Hide' : 'Show' }} Details
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  error: any;
  pluginId: string;
}>();

defineEmits<{
  retry: [];
}>();

const showDetails = ref(false);

function formatTimestamp(timestamp?: Date): string {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString();
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

.error-details {
  text-align: left;
  background: #f5f5f5;
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
