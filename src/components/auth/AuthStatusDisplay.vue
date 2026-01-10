<template>
  <v-alert
    v-if="showWarning"
    :type="isExpiringSoon ? 'warning' : 'info'"
    variant="tonal"
    closable
    class="mb-4"
    @click:close="dismissed = true"
  >
    <template #prepend>
      <v-icon>{{ isExpiringSoon ? 'mdi-alert' : 'mdi-information' }}</v-icon>
    </template>
    
    <div>
      <strong v-if="isExpiringSoon">{{ t('auth.sessionExpiringSoon') }}</strong>
      <strong v-else>{{ t('auth.sessionActive') }}</strong>
      <p class="text-body-2 mt-1">
        {{ statusMessage }}
      </p>
    </div>
    
    <template
      v-if="isExpiringSoon"
      #append
    >
      <v-btn
        size="small"
        variant="outlined"
        :loading="isRefreshing"
        @click="handleRefresh"
      >
        {{ t('auth.extendSession') }}
      </v-btn>
    </template>
  </v-alert>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/utils/logger'

const { t } = useI18n()

const auth = useAuth()
const dismissed = ref(false)
const updateInterval = ref<number | null>(null)
const timeRemaining = ref<number>(0)

const isAuthenticated = computed(() => auth.isAuthenticated.value)
const tokenExpirationDate = computed(() => auth.tokenExpirationDate.value)
const isRefreshing = computed(() => auth.isRefreshing.value)

const isExpiringSoon = computed(() => {
  if (!tokenExpirationDate.value) return false
  const minutesRemaining = Math.floor(timeRemaining.value / 60000)
  return minutesRemaining <= 10 && minutesRemaining > 0
})

const showWarning = computed(() => {
  return isAuthenticated.value && !dismissed.value && isExpiringSoon.value
})

const statusMessage = computed(() => {
  if (!tokenExpirationDate.value) return t('auth.tokenInfoNotAvailable')
  
  const minutesRemaining = Math.floor(timeRemaining.value / 60000)
  
  if (minutesRemaining <= 0) {
    return t('auth.sessionExpired')
  } else if (minutesRemaining <= 5) {
    return t('auth.sessionExpiringMinutes', { minutes: minutesRemaining })
  } else if (minutesRemaining <= 10) {
    return t('auth.sessionExpiringInMinutes', { minutes: minutesRemaining })
  } else {
    const hoursRemaining = Math.floor(minutesRemaining / 60)
    if (hoursRemaining >= 1) {
      return t('auth.sessionActiveHours', { hours: hoursRemaining })
    }
    return t('auth.sessionActiveMinutes', { minutes: minutesRemaining })
  }
})

function updateTimeRemaining() {
  if (!tokenExpirationDate.value) {
    timeRemaining.value = 0
    return
  }
  
  const now = new Date().getTime()
  const expiration = new Date(tokenExpirationDate.value).getTime()
  timeRemaining.value = Math.max(0, expiration - now)
}

async function handleRefresh() {
  try {
    await auth.refreshToken()
    dismissed.value = false // Show success message
  } catch (error) {
    logger.error('AuthStatusDisplay', 'Manual token refresh failed', error)
  }
}

onMounted(() => {
  updateTimeRemaining()
  updateInterval.value = window.setInterval(updateTimeRemaining, 60000) // Update every minute
})

onUnmounted(() => {
  if (updateInterval.value !== null) {
    clearInterval(updateInterval.value)
  }
})
</script>
