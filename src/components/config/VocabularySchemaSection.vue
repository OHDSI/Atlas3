<template>
  <div class="vocabulary-schema-section">
    <v-card>
      <v-card-title>Vocabulary Schema</v-card-title>
      <v-card-text>
        <p class="text-body-1 mb-4">
          Configure the database schema name for vocabulary lookups.
          This setting controls which PostgreSQL schema is used when querying the OMOP vocabulary tables.
        </p>

        <!-- Schema Input Field -->
        <v-text-field
          v-model="localSchema"
          label="Vocabulary Schema"
          hint="PostgreSQL schema name (e.g., 'public', 'vocab_v5')"
          persistent-hint
          :rules="validationRules"
          :disabled="isSaving"
          :loading="isSaving"
          variant="outlined"
          class="mb-2"
        >
          <template #prepend-inner>
            <v-icon>mdi-database-outline</v-icon>
          </template>
        </v-text-field>

        <v-alert
          v-if="validationError"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-2"
        >
          {{ validationError }}
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Success Toast with Undo -->
    <v-snackbar
      v-model="showToast"
      :timeout="5000"
      color="success"
      location="bottom"
    >
      {{ toastMessage }}
      <template #actions>
        <v-btn
          v-if="canUndo"
          variant="text"
          @click="handleUndo"
        >
          Undo
        </v-btn>
        <v-btn
          variant="text"
          @click="showToast = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Error Toast -->
    <v-snackbar
      v-model="showErrorToast"
      :timeout="5000"
      color="error"
      location="bottom"
    >
      {{ errorMessage }}
      <template #actions>
        <v-btn
          variant="text"
          @click="showErrorToast = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { useConfigStore } from '@/stores/config'
import { useConfigUndo } from '@/composables/useConfigUndo'
import { validateSchemaName } from '@/models/config.types'
import { logger } from '@/utils/logger'

const configStore = useConfigStore()
const { undoStack, isSaving, pushUndo, performUndo } = useConfigUndo<string>()

// State
const localSchema = ref('')
const previousSchema = ref('')
const validationError = ref<string | null>(null)
const showToast = ref(false)
const showErrorToast = ref(false)
const toastMessage = ref('')
const errorMessage = ref('')

/**
 * Validation rules for the schema field
 */
const validationRules = [
  (v: string) => {
    const result = validateSchemaName(v)
    if (result === true) {
      validationError.value = null
      return true
    }
    validationError.value = result
    return result
  }
]

/**
 * Check if undo is available
 */
const canUndo = computed(() => undoStack.value.length > 0)

/**
 * Load vocabulary schema on mount
 */
onMounted(async () => {
  try {
    await configStore.fetchVocabularySchema()
    localSchema.value = configStore.vocabularySchema
    previousSchema.value = configStore.vocabularySchema
  } catch (error) {
    logger.error('VocabularySchema', 'Failed to load vocabulary schema', error)
  }
})

/**
 * Optimistic update: Update UI immediately when user types
 */
watch(localSchema, (newValue) => {
  // Only update store if valid
  const validation = validateSchemaName(newValue)
  if (validation === true) {
    configStore.vocabularySchema = newValue
  }
})

/**
 * Debounced save: Save to localStorage after user stops typing
 */
watchDebounced(
  localSchema,
  async (newValue, oldValue) => {
    // Skip if value hasn't changed or is invalid
    if (newValue === oldValue) return

    const validation = validateSchemaName(newValue)
    if (validation !== true) {
      validationError.value = validation
      return
    }

    // Skip if no actual change from saved value
    if (newValue === previousSchema.value) return

    isSaving.value = true

    try {
      // Save to localStorage
      await configStore.updateVocabularySchema(newValue)

      // Push to undo stack
      pushUndo('vocabularySchema', previousSchema.value, newValue)

      // Update previous value for next comparison
      previousSchema.value = newValue

      // Show success toast
      toastMessage.value = `Vocabulary schema updated to "${newValue}"`
      showToast.value = true
    } catch (error: any) {
      // Rollback on error
      localSchema.value = previousSchema.value
      configStore.vocabularySchema = previousSchema.value

      errorMessage.value = error.message || 'Failed to update schema. Please try again.'
      showErrorToast.value = true
    } finally {
      isSaving.value = false
    }
  },
  { debounce: 500 } // 500ms debounce
)

/**
 * Handle undo action
 */
async function handleUndo() {
  if (undoStack.value.length === 0) return

  const latestOperation = undoStack.value[0]
  if (!latestOperation) return

  try {
    await performUndo(latestOperation.id, async (previousValue: string) => {
      // Revert to previous value
      localSchema.value = previousValue
      previousSchema.value = previousValue

      // Save the reverted value
      await configStore.updateVocabularySchema(previousValue)

      // Show feedback
      toastMessage.value = `Reverted to "${previousValue}"`
      showToast.value = true
    })
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to undo. Please try again.'
    showErrorToast.value = true
  }
}
</script>

<style scoped>
.vocabulary-schema-section {
  max-width: 800px;
}
</style>
