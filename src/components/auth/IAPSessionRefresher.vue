<template>
  <!-- Invisible iframe for Google IAP session refresh -->
  <iframe
    v-if="isIAPEnabled"
    ref="iapFrame"
    src="/_gcp_iap/session_refresher"
    style="display: none"
    @load="handleIframeLoad"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { logger } from '@/utils/logger'

const iapFrame = ref<HTMLIFrameElement | null>(null)
const refreshInterval = ref<number | null>(null)

// Check if IAP is enabled based on environment or detection
const isIAPEnabled = computed(() => {
  // IAP would be detected by presence of x-goog-iap-jwt-assertion header
  // or explicit configuration
  return import.meta.env.VITE_AUTH_IAP_ENABLED === 'true'
})

function handleIframeLoad() {
  logger.debug('IAP', 'Session refresher iframe loaded')
}

function scheduleRefresh() {
  // Google IAP recommends refreshing every 45 minutes
  const refreshIntervalMs = 45 * 60 * 1000

  refreshInterval.value = window.setInterval(() => {
    logger.debug('IAP', 'Refreshing IAP session')
    if (iapFrame.value) {
      // Force iframe reload to refresh IAP session
      const src = iapFrame.value.src
      iapFrame.value.src = ''
      setTimeout(() => {
        if (iapFrame.value) {
          iapFrame.value.src = src
        }
      }, 100)
    }
  }, refreshIntervalMs)
}

onMounted(() => {
  if (isIAPEnabled.value) {
    scheduleRefresh()
  }
})

onUnmounted(() => {
  if (refreshInterval.value !== null) {
    clearInterval(refreshInterval.value)
  }
})
</script>
