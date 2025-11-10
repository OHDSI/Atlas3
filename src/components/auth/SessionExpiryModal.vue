<template>
  <v-dialog
    :model-value="modelValue"
    :persistent="true"
    max-width="480"
    @update:model-value="handleDismiss"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-alert-circle" color="warning" class="mr-2" />
        Session Expiring Soon
      </v-card-title>

      <v-card-text>
        <p class="text-body-1 mb-4">
          Your session will expire in
          <strong :class="countdownColorClass">{{ formattedTime }}</strong>.
        </p>
        <p class="text-body-2">
          Would you like to extend your session?
        </p>

        <v-alert
          v-if="extensionError"
          type="error"
          density="compact"
          class="mt-4"
        >
          {{ extensionError }}
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-btn
          color="primary"
          :loading="isExtending"
          @click="$emit('extend')"
        >
          Extend Session
        </v-btn>
        <v-btn
          color="error"
          variant="outlined"
          :disabled="isExtending"
          @click="$emit('logout')"
        >
          Logout
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import type { SessionExpiryModalProps } from './types';

const props = defineProps<SessionExpiryModalProps>();
const emit = defineEmits<{
  extend: [];
  logout: [];
  dismiss: [];
  expired: [];
  'update:model-value': [value: boolean];
}>();

const localRemainingSeconds = ref(props.remainingSeconds);
let countdownInterval: NodeJS.Timeout | null = null;

// Update remaining time every second (T032)
watch(() => props.modelValue, (isVisible) => {
  if (isVisible) {
    // Start countdown
    countdownInterval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((props.expiresAt.getTime() - now) / 1000));
      localRemainingSeconds.value = remaining;

      // Emit expired event when time runs out (T035)
      if (remaining === 0) {
        if (countdownInterval) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }
        emit('expired');
      }
    }, 1000);
  } else {
    // Stop countdown
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }
});

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
});

// Format time display
const formattedTime = computed(() => {
  const seconds = localRemainingSeconds.value;
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }
  return `${seconds}s`;
});

// Color class for countdown (warning when >60s, error when <60s)
const countdownColorClass = computed(() => {
  return localRemainingSeconds.value < 60 ? 'text-error' : 'text-warning';
});

// Handle dismiss (X button or ESC key) (T034)
function handleDismiss(value: boolean) {
  emit('update:model-value', value);
  emit('dismiss');
}
</script>
