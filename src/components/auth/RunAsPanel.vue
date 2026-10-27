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

      <AtlasTextField
        v-model="targetUser"
        :label="tv('components.welcome.username')"
        :placeholder="tv('components.welcome.username')"
        variant="outlined"
        prepend-icon="mdi-account"
        :disabled="isLoading"
        class="mb-3"
        @keyup.enter="handleRunAs"
      />

      <AtlasButton
        size="lg"
        block
        icon="mdi-account-switch"
        :loading="isLoading"
        :disabled="!targetUser.trim() || isLoading"
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
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/composables/useI18n'

const { t, tv } = useI18n()
const emit = defineEmits<{ completed: [] }>()

const auth = useAuth()
const targetUser = ref('')
const errorMessage = ref<string | null>(null)
const isLoading = ref(false)

async function handleRunAs() {
  if (!targetUser.value.trim()) return

  errorMessage.value = null
  isLoading.value = true

  try {
    await auth.runAs(targetUser.value.trim())
    targetUser.value = ''
    emit('completed')
  } catch (error) {
    const message = error instanceof Error ? error.message : tv('auth.failedToRunAsUser')
    errorMessage.value = message
  } finally {
    isLoading.value = false
  }
}
</script>
