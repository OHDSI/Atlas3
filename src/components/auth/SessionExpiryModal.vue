<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="SESSION"
    title="Session Expiring Soon"
    :persistent="true"
    max-width="480"
    @close="handleDismiss(false)"
    @update:model-value="handleDismiss"
  >
    <p class="text-body-1 mb-4">
      Your session will expire in
      <strong :class="countdownColorClass">{{ formattedTime }}</strong>.
    </p>
    <p class="text-body-2">
      Would you like to extend your session?
    </p>

    <AtlasAlert
      v-if="extensionError"
      severity="danger"
      density="compact"
      class="mt-4"
    >
      {{ extensionError }}
    </AtlasAlert>
    <template #actions>
      <AtlasButton
        :loading="isExtending"
        @click="$emit('extend')"
      >
        Extend Session
      </AtlasButton>
      <AtlasButton
        variant="danger"
        :disabled="isExtending"
        @click="$emit('logout')"
      >
        Logout
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasDialog } from '@/components/ui'
import { computed, ref, watch, onUnmounted } from 'vue'
import type { SessionExpiryModalProps } from './types'

const props = defineProps<SessionExpiryModalProps>()
const emit = defineEmits<{
  extend: []
  logout: []
  dismiss: []
  expired: []
  'update:model-value': [value: boolean]
}>()

const localRemainingSeconds = ref(props.remainingSeconds)
let countdownInterval: NodeJS.Timeout | null = null

// Update remaining time every second
watch(
  () => props.modelValue,
  isVisible => {
    if (isVisible) {
      // Start countdown
      countdownInterval = setInterval(() => {
        const now = Date.now()
        const remaining = Math.max(0, Math.floor((props.expiresAt.getTime() - now) / 1000))
        localRemainingSeconds.value = remaining

        // Emit expired event when time runs out
        if (remaining === 0) {
          if (countdownInterval) {
            clearInterval(countdownInterval)
            countdownInterval = null
          }
          emit('expired')
        }
      }, 1000)
    } else {
      // Stop countdown
      if (countdownInterval) {
        clearInterval(countdownInterval)
        countdownInterval = null
      }
    }
  }
)

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
})

// Format time display
const formattedTime = computed(() => {
  const seconds = localRemainingSeconds.value
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }
  return `${seconds}s`
})

// Color class for countdown (warning when >60s, error when <60s)
const countdownColorClass = computed(() => {
  return localRemainingSeconds.value < 60 ? 'text-error' : 'text-warning'
})

// Handle dismiss (X button or ESC key)
function handleDismiss(value: boolean) {
  emit('update:model-value', value)
  emit('dismiss')
}
</script>
