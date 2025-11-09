<template>
  <v-card>
    <v-card-title class="text-h6">
      <v-icon left>mdi-account-switch</v-icon>
      Run As User
    </v-card-title>

    <v-card-text>
      <v-alert v-if="errorMessage" type="error" class="mb-4" closable @click:close="errorMessage = null">
        {{ errorMessage }}
      </v-alert>

      <v-alert v-if="isRunningAs" type="info" variant="tonal" class="mb-4">
        <div class="d-flex align-center justify-space-between">
          <div>
            <div class="text-subtitle-2">Currently running as:</div>
            <div class="text-h6">{{ targetUsername }}</div>
            <div class="text-caption mt-1">Original user: {{ originalUsername }}</div>
          </div>
          <v-btn
            color="primary"
            variant="outlined"
            @click="handleExitRunAs"
            :loading="isExiting"
          >
            <v-icon left>mdi-exit-run</v-icon>
            Exit Run As
          </v-btn>
        </div>
      </v-alert>

      <v-text-field
        v-model="targetUser"
        label="Target Username"
        placeholder="Enter username to impersonate"
        variant="outlined"
        prepend-inner-icon="mdi-account"
        :disabled="isRunningAs || isLoading"
        @keyup.enter="handleRunAs"
        class="mb-3"
      ></v-text-field>

      <v-btn
        color="primary"
        block
        size="large"
        :loading="isLoading"
        :disabled="!targetUser.trim() || isRunningAs"
        @click="handleRunAs"
      >
        <v-icon left>mdi-account-switch</v-icon>
        Run As User
      </v-btn>

      <v-alert type="warning" variant="tonal" class="mt-4">
        <div class="text-caption">
          <strong>Warning:</strong> Running as another user will assume their permissions and identity.
          All actions will be performed as the target user.
        </div>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'

const auth = useAuth()
const targetUser = ref('')
const errorMessage = ref<string | null>(null)
const isLoading = ref(false)
const isExiting = ref(false)

const isRunningAs = computed(() => {
  return auth.isRunningAs?.value || false
})

const targetUsername = computed(() => {
  return auth.user.value?.displayName || 'Unknown'
})

const originalUsername = computed(() => {
  return auth.originalUser?.value?.displayName || auth.userDisplayName.value
})

async function handleRunAs() {
  if (!targetUser.value.trim()) return

  errorMessage.value = null
  isLoading.value = true

  try {
    await auth.runAs(targetUser.value.trim())
    targetUser.value = ''
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run as user'
    errorMessage.value = message
  } finally {
    isLoading.value = false
  }
}

async function handleExitRunAs() {
  errorMessage.value = null
  isExiting.value = true

  try {
    await auth.exitRunAs()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to exit run-as'
    errorMessage.value = message
  } finally {
    isExiting.value = false
  }
}
</script>
