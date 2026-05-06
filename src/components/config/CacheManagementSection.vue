<template>
  <div class="cache-management-section">
    <v-card>
      <v-card-title>Cache Management</v-card-title>
      <v-card-text>
        <p class="text-body-1 mb-4">
          Clear cached configuration data to force a refresh from the server. This can help resolve
          issues with outdated or corrupted data.
        </p>

        <!-- Cache Statistics -->
        <AtlasAlert
          v-if="cacheStats"
          severity="info"
          class="mb-4"
        >
          <strong>Cache Status:</strong>
          {{ cacheStats.itemCount }} item{{ cacheStats.itemCount !== 1 ? 's' : '' }} cached ({{
            formatBytes(cacheStats.estimatedSize)
          }})
        </AtlasAlert>

        <!-- Clear Cache Button -->
        <AtlasButton
          tone="warning"
          icon="mdi-trash-can-outline"
          :loading="isLoading"
          :disabled="isLoading"
          @click="showConfirmDialog = true"
        >
          Clear Configuration Cache
        </AtlasButton>
      </v-card-text>
    </v-card>

    <!-- Confirmation Dialog -->
    <AtlasDialog
      v-model="showConfirmDialog"
      eyebrow="CONFIRM"
      title="Clear Cache"
      max-width="400"
      @close="showConfirmDialog = false"
    >
      Are you sure you want to clear the configuration cache? This action cannot be undone.
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="showConfirmDialog = false"
        >
          Cancel
        </AtlasButton>
        <AtlasButton
          :loading="isLoading"
          @click="handleClearCache"
        >
          Clear Cache
        </AtlasButton>
      </template>
    </AtlasDialog>

    <!-- Toast Notification -->
    <AtlasSnackbar
      v-model="showToast"
      :severity="toastSeverity"
      :text="toastMessage"
      :timeout="5000"
      location="bottom"
    />

    <!-- TrexSQL Cache Section -->
    <TrexSQLCacheSection />
  </div>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasDialog, AtlasSnackbar } from '@/components/ui'
import type { AtlasSnackbarSeverity } from '@/components/ui'
import { ref, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import { logger } from '@/utils/logger'
import TrexSQLCacheSection from './TrexSQLCacheSection.vue'

const configStore = useConfigStore()

// State
const cacheStats = ref<{ itemCount: number; estimatedSize: number } | null>(null)
const isLoading = ref(false)
const showConfirmDialog = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const toastSeverity = ref<AtlasSnackbarSeverity>('success')

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
    toastSeverity.value = 'success'
    showToast.value = true
    showConfirmDialog.value = false
  } catch (error: unknown) {
    // Error: show error toast
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to clear cache. Please try again.'
    toastMessage.value = errorMessage
    toastSeverity.value = 'danger'
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
