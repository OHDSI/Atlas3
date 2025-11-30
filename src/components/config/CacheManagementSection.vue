<template>
  <div class="cache-management-section">
    <v-card>
      <v-card-title>Cache Management</v-card-title>
      <v-card-text>
        <p class="text-body-1 mb-4">
          Clear cached configuration data to force a refresh from the server.
          This can help resolve issues with outdated or corrupted data.
        </p>

        <!-- Cache Statistics -->
        <v-alert
          v-if="cacheStats"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          <div class="d-flex align-center">
            <v-icon class="mr-2">
              mdi-information
            </v-icon>
            <div>
              <strong>Cache Status:</strong>
              {{ cacheStats.itemCount }} item{{ cacheStats.itemCount !== 1 ? 's' : '' }} cached
              ({{ formatBytes(cacheStats.estimatedSize) }})
            </div>
          </div>
        </v-alert>

        <!-- Clear Cache Button -->
        <v-btn
          color="warning"
          :loading="isLoading"
          :disabled="isLoading"
          @click="showConfirmDialog = true"
        >
          <v-icon start>
            mdi-trash-can-outline
          </v-icon>
          Clear Configuration Cache
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Confirmation Dialog -->
    <v-dialog
      v-model="showConfirmDialog"
      max-width="400"
    >
      <v-card>
        <v-card-title>Clear Cache</v-card-title>
        <v-card-text>
          Are you sure you want to clear the configuration cache?
          This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showConfirmDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :loading="isLoading"
            @click="handleClearCache"
          >
            Clear Cache
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Toast Notification -->
    <v-snackbar
      v-model="showToast"
      :timeout="5000"
      :color="toastColor"
      location="bottom"
    >
      {{ toastMessage }}
      <template #actions>
        <v-btn
          variant="text"
          @click="showToast = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import { logger } from '@/utils/logger'

const configStore = useConfigStore()

// State
const cacheStats = ref<{ itemCount: number; estimatedSize: number } | null>(null)
const isLoading = ref(false)
const showConfirmDialog = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const toastColor = ref<'success' | 'error'>('success')

/**
 * Load cache statistics on mount
 */
onMounted(async () => {
  await loadCacheStats()
})

/**
 * Load cache statistics
 */
async function loadCacheStats() {
  try {
    cacheStats.value = await configStore.getCacheStats()
  } catch (error) {
    logger.error('CacheManagement', 'Failed to load cache stats', error)
  }
}

/**
 * Handle clear cache action with confirmation
 */
async function handleClearCache() {
  isLoading.value = true

  try {
    await configStore.clearCache()

    // Success: update stats and show toast
    await loadCacheStats()
    toastMessage.value = 'Configuration cache cleared successfully'
    toastColor.value = 'success'
    showToast.value = true
    showConfirmDialog.value = false
  } catch (error: unknown) {
    // Error: show error toast
    const errorMessage = error instanceof Error ? error.message : 'Failed to clear cache. Please try again.'
    toastMessage.value = errorMessage
    toastColor.value = 'error'
    showToast.value = true
  } finally {
    isLoading.value = false
  }
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
</script>

<style scoped>
.cache-management-section {
  max-width: 800px;
}
</style>
