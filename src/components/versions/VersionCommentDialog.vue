<template>
  <v-dialog
    v-model="isOpen"
    max-width="600px"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>{{ t('components.versions.editComment') }}</span>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="handleClose"
        />
      </v-card-title>

      <v-card-text>
        <v-form
          ref="formRef"
          @submit.prevent="handleSave"
        >
          <v-textarea
            v-model="commentText"
            :label="tv('columns.comment', 'Comment')"
            :placeholder="tv('components.versions.commentPlaceholder')"
            :rules="[commentMaxLengthRule]"
            :counter="500"
            rows="4"
            variant="outlined"
            autofocus
            class="mt-4"
          />

          <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            closable
            class="mt-2"
            @click:close="error = null"
          >
            {{ error }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="handleClose"
        >
          {{ t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          :disabled="!isCommentChanged || saving"
          @click="handleSave"
        >
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/utils/logger'
import type { Version, CommentUpdatePayload } from './types'
import { updateVersion as updateCohortVersion } from '@/services/cohort-definition-versions.service'
import { updateVersion as updateConceptSetVersion } from '@/services/concept-set-versions.service'
import { updatePathwayVersion } from '@/services/pathway-versions.service'
import { updateIncidenceRateVersion } from '@/services/incidence-rate-versions.service'

// Props
const props = defineProps<{
  modelValue: boolean
  version: Version | null
  assetType: 'cohortdefinition' | 'conceptset' | 'pathway-analysis' | 'ir'
  assetId: number
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', version: Version): void
}>()

// Composables
const { t, tv } = useI18n()

// Local state
const commentText = ref('')
const originalComment = ref('')
const saving = ref(false)
const error = ref<string | null>(null)
const formRef = ref<HTMLFormElement | null>(null)

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const isCommentChanged = computed(() => {
  return commentText.value !== originalComment.value
})

// Validation rules (T053)
function commentMaxLengthRule(value: string): boolean | string {
  if (!value) return true
  if (value.length > 500) {
    return 'Comment must be less than 500 characters'
  }
  return true
}

// Watch for version changes to update comment text
watch(
  () => props.version,
  newVersion => {
    if (newVersion) {
      commentText.value = newVersion.comment || ''
      originalComment.value = newVersion.comment || ''
    }
  },
  { immediate: true }
)

// Get appropriate API service
const updateVersionAPI =
  props.assetType === 'cohortdefinition'
    ? updateCohortVersion
    : props.assetType === 'pathway-analysis'
      ? (id: number, version: number, payload: CommentUpdatePayload) =>
          updatePathwayVersion(id, version, {
            comment: payload.comment,
            archived: payload.archived,
          })
      : props.assetType === 'ir'
        ? (id: number, version: number, payload: CommentUpdatePayload) =>
            updateIncidenceRateVersion(id, version, {
              comment: payload.comment,
              archived: payload.archived,
            })
        : updateConceptSetVersion

/**
 * Handle save button click
 * T051: Comment save handler with API call
 */
async function handleSave(): Promise<void> {
  if (!props.version) return

  // Validate
  const validationResult = await formRef.value?.validate()
  if (!validationResult?.valid) return

  saving.value = true
  error.value = null

  try {
    const payload: CommentUpdatePayload = {
      comment: commentText.value,
      archived: false,
    }

    const updatedVersion = await updateVersionAPI(props.assetId, props.version.version, payload)

    // Emit saved event with updated version
    emit('saved', updatedVersion)

    // Close dialog
    handleClose()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save comment'
    logger.error('VersionCommentDialog', 'Failed to save comment', err)
  } finally {
    saving.value = false
  }
}

/**
 * Handle close/cancel
 */
function handleClose(): void {
  // Reset to original values
  commentText.value = originalComment.value
  error.value = null

  // Close dialog
  isOpen.value = false
}
</script>

<style scoped>
/* Additional styles if needed */
</style>
