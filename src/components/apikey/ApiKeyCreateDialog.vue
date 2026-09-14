<template>
  <AtlasDialog
    :model-value="modelValue"
    :eyebrow="t('apiKeys.create.eyebrow', 'NEW KEY').value"
    :title="result ? t('apiKeys.create.resultTitle', 'API Key Created').value : t('apiKeys.create.title', 'New API Key').value"
    :subtitle="result ? undefined : t('apiKeys.create.subtitle', 'Generate a personal API key for programmatic access.').value"
    max-width="520"
    :persistent="!!result"
    @update:model-value="onDialogUpdate"
  >
    <template v-if="!result">
      <AtlasAlert
        v-if="error"
        severity="danger"
        density="compact"
        class="apikey-create-dialog__alert"
      >
        {{ error }}
      </AtlasAlert>

      <AtlasTextField
        v-model="name"
        :label="t('apiKeys.create.name', 'Name').value"
        :placeholder="t('apiKeys.create.namePlaceholder', 'e.g. My laptop').value"
        required
        :error="nameError"
        data-testid="apikey-create-name"
        class="apikey-create-dialog__field"
      />

      <AtlasTextField
        v-model="description"
        :label="t('apiKeys.create.description', 'Description').value"
        multiline
        :rows="2"
        data-testid="apikey-create-description"
        class="apikey-create-dialog__field"
      />

      <AtlasSelect
        v-model="expirationPreset"
        :label="t('apiKeys.create.expiration', 'Expiration').value"
        :items="expirationOptions"
        data-testid="apikey-create-expiration"
        class="apikey-create-dialog__field"
      />

      <AtlasTextField
        v-if="expirationPreset === 'custom'"
        v-model="customDays"
        type="number"
        :label="t('apiKeys.create.customDays', 'Number of days').value"
        :placeholder="t('apiKeys.create.customDaysPlaceholder', 'Blank = never expires').value"
        data-testid="apikey-create-custom-days"
        class="apikey-create-dialog__field"
      />
    </template>

    <template v-else>
      <AtlasAlert
        severity="warning"
        density="compact"
        class="apikey-create-dialog__alert"
      >
        {{ t('apiKeys.create.resultWarning', "Copy this key now — you won't be able to see it again.").value }}
      </AtlasAlert>

      <AtlasTextField
        :model-value="result.rawKey"
        :label="t('apiKeys.create.rawKeyLabel', 'API Key').value"
        readonly
        data-testid="apikey-create-rawkey"
        class="apikey-create-dialog__field"
      >
        <template #append-inner>
          <AtlasIconButton
            icon="mdi-content-copy"
            size="sm"
            variant="text"
            :aria-label="t('apiKeys.create.copy', 'Copy').value"
            data-testid="apikey-create-copy"
            @click="copyRawKey"
          />
        </template>
      </AtlasTextField>
    </template>

    <template #actions>
      <template v-if="!result">
        <AtlasButton
          variant="ghost"
          @click="close"
        >
          {{ t('apiKeys.create.cancel', 'Cancel') }}
        </AtlasButton>
        <AtlasButton
          :loading="submitting"
          data-testid="apikey-create-generate"
          @click="handleGenerate"
        >
          {{ t('apiKeys.create.generate', 'Generate') }}
        </AtlasButton>
      </template>
      <AtlasButton
        v-else
        data-testid="apikey-create-done"
        @click="handleDone"
      >
        {{ t('apiKeys.create.done', 'Done') }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  AtlasDialog,
  AtlasTextField,
  AtlasSelect,
  AtlasButton,
  AtlasIconButton,
  AtlasAlert,
} from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useNotifications } from '@/stores/notifications'
import { createApiKey } from '@/services/apikey.service'
import type { ApiKeyResult } from '@/models/apikey.types'
import { logger } from '@/utils/logger'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  created: []
}>()

const { t } = useI18n()
const notify = useNotifications()

type ExpirationPreset = 'never' | '30' | '90' | '365' | 'custom'

const name = ref('')
const description = ref('')
const expirationPreset = ref<ExpirationPreset>('never')
const customDays = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)
const nameError = ref<string | undefined>(undefined)
const result = ref<ApiKeyResult | null>(null)

const expirationOptions = computed(() => [
  { title: t('apiKeys.create.expirationNever', 'Never expires').value, value: 'never' },
  { title: t('apiKeys.create.expirationDays', '{days} days', { days: '30' }).value, value: '30' },
  { title: t('apiKeys.create.expirationDays', '{days} days', { days: '90' }).value, value: '90' },
  { title: t('apiKeys.create.expirationDays', '{days} days', { days: '365' }).value, value: '365' },
  { title: t('apiKeys.create.expirationCustom', 'Custom…').value, value: 'custom' },
])

function resolveExpiresInDays(): number | null {
  if (expirationPreset.value === 'never') return null
  if (expirationPreset.value === 'custom') {
    const trimmed = customDays.value.trim()
    if (trimmed === '') return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null
  }
  return Number(expirationPreset.value)
}

function resetForm() {
  name.value = ''
  description.value = ''
  expirationPreset.value = 'never'
  customDays.value = ''
  submitting.value = false
  error.value = null
  nameError.value = undefined
  result.value = null
}

watch(
  () => props.modelValue,
  open => {
    if (open) resetForm()
  }
)

async function handleGenerate() {
  const trimmedName = name.value.trim()
  if (!trimmedName) {
    nameError.value = t('apiKeys.create.nameRequired', 'Name is required').value
    return
  }
  nameError.value = undefined
  error.value = null
  submitting.value = true
  try {
    const response = await createApiKey({
      name: trimmedName,
      description: description.value.trim() || undefined,
      expiresInDays: resolveExpiresInDays(),
    })
    if (response.success) {
      result.value = response.data
    } else {
      error.value = response.error.message
    }
  } finally {
    submitting.value = false
  }
}

async function copyRawKey() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value.rawKey)
    notify.success(t('apiKeys.create.copied', 'Copied to clipboard').value)
  } catch (err) {
    logger.error('ApiKeyCreateDialog', 'Clipboard copy failed', err)
    notify.danger(t('apiKeys.create.copyFailed', 'Could not copy to clipboard').value)
  }
}

function close() {
  emit('update:modelValue', false)
}

function handleDone() {
  emit('update:modelValue', false)
  emit('created')
}

function onDialogUpdate(open: boolean) {
  // Ignore backdrop/esc dismissal attempts while the one-time raw key is
  // showing; AtlasDialog's persistent prop already blocks those, but guard
  // here too since the X button bypasses persistent.
  if (!open && result.value) {
    handleDone()
    return
  }
  emit('update:modelValue', open)
}
</script>

<style scoped>
.apikey-create-dialog__field {
  margin-bottom: 12px;
}
.apikey-create-dialog__alert {
  margin-bottom: 16px;
}
</style>
