<template>
  <v-card>
    <v-card-title class="text-h6">
      <AtlasIcon left>
        mdi-account-switch
      </AtlasIcon>
      {{ t('components.welcome.runas') }}
    </v-card-title>

    <v-card-text>
      <AtlasAlert
        v-if="errorMessage"
        severity="danger"
        class="mb-4"
        :closable="true"
        @close="errorMessage = null"
      >
        {{ errorMessage }}
      </AtlasAlert>

      <AtlasAlert
        v-if="isRunningAs"
        severity="info"
        class="mb-4"
      >
        <div class="d-flex align-center justify-space-between">
          <div>
            <div class="text-subtitle-2">
              {{ t('auth.currentlyRunningAs') }}
            </div>
            <div class="text-h6">
              {{ targetUsername }}
            </div>
            <div class="text-caption mt-1">
              {{ t('auth.originalUser', { username: originalUsername }) }}
            </div>
          </div>
          <AtlasButton
            variant="secondary"
            icon="mdi-exit-run"
            :loading="isExiting"
            @click="handleExitRunAs"
          >
            {{ t('auth.exitRunAs') }}
          </AtlasButton>
        </div>
      </AtlasAlert>

      <AtlasTextField
        v-model="targetUser"
        :label="tv('components.welcome.username')"
        :placeholder="tv('components.welcome.username')"
        variant="outlined"
        prepend-icon="mdi-account"
        :disabled="isRunningAs || isLoading"
        class="mb-3"
        @keyup.enter="handleRunAs"
      />

      <AtlasButton
        size="lg"
        block
        icon="mdi-account-switch"
        :loading="isLoading"
        :disabled="!targetUser.trim() || isRunningAs"
        @click="handleRunAs"
      >
        {{ t('components.welcome.runas') }}
      </AtlasButton>

      <AtlasAlert
        severity="warning"
        class="mt-4"
      >
        <div class="text-caption">
          <strong>{{ t('facets.values.warning') }}:</strong> {{ t('auth.runAsWarning') }}
        </div>
      </AtlasAlert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasIcon, AtlasTextField } from '@/components/ui'
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/composables/useI18n'

const { t, tv } = useI18n()

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
    const message = error instanceof Error ? error.message : tv('auth.failedToRunAsUser')
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
    const message = error instanceof Error ? error.message : tv('auth.failedToExitRunAs')
    errorMessage.value = message
  } finally {
    isExiting.value = false
  }
}
</script>
