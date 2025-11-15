<template>
  <div class="censor-window-editor">
    <div class="pa-4">
      <div class="d-flex align-center mb-2">
        <h3 class="text-h6">
          {{ t('components.cohortExpressionEditor.censoringEvents', 'Censor Window').value }}
        </h3>
        <v-tooltip location="right">
          <template #activator="{ props }">
            <v-icon
              v-bind="props"
              icon="mdi-help-circle-outline"
              size="small"
              class="ml-2 text-medium-emphasis"
            />
          </template>
          <span>{{ t('components.cohortExpressionEditor.cohortErasTitle', 'Cohort Eras').value }}</span>
        </v-tooltip>
      </div>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Specify when cohort membership begins and ends
      </p>

      <div>
        <!-- Start Date Configuration -->
        <div class="date-config-section">
          <h4 class="text-subtitle-1 mb-2">
            {{ t('options.startDate', 'Start Date').value }}
          </h4>
          <v-row>
            <v-col cols="6">
              <v-select
                v-model="localStartDateField"
                :items="dateFieldOptions"
                :label="t('common.select', 'Date Field').value"
                :disabled="disabled"
                variant="outlined"
                density="compact"
                @update:model-value="updateStartDate"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="localStartOffset"
                type="number"
                :label="t('components.cohortExpressionEditor.days', 'Offset (days)').value"
                :disabled="disabled"
                :rules="[offsetRule]"
                variant="outlined"
                density="compact"
                @blur="updateStartDate"
              >
                <template #append-inner>
                  <v-tooltip location="top">
                    <template #activator="{ props }">
                      <v-icon
                        v-bind="props"
                        icon="mdi-information-outline"
                        size="small"
                        class="text-medium-emphasis"
                      />
                    </template>
                    <span>Negative values represent days before the index event</span>
                  </v-tooltip>
                </template>
              </v-text-field>
            </v-col>
          </v-row>
        </div>

        <!-- End Date Configuration -->
        <div class="date-config-section mt-4">
          <h4 class="text-subtitle-1 mb-2">
            {{ t('options.endDate', 'End Date').value }}
          </h4>
          <v-row>
            <v-col cols="6">
              <v-select
                v-model="localEndDateField"
                :items="dateFieldOptions"
                :label="t('common.select', 'Date Field').value"
                :disabled="disabled"
                variant="outlined"
                density="compact"
                @update:model-value="updateEndDate"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="localEndOffset"
                type="number"
                :label="t('components.cohortExpressionEditor.days', 'Offset (days)').value"
                :disabled="disabled"
                :rules="[offsetRule]"
                variant="outlined"
                density="compact"
                @blur="updateEndDate"
              >
                <template #append-inner>
                  <v-tooltip location="top">
                    <template #activator="{ props }">
                      <v-icon
                        v-bind="props"
                        icon="mdi-information-outline"
                        size="small"
                        class="text-medium-emphasis"
                      />
                    </template>
                    <span>Negative values represent days before the index event</span>
                  </v-tooltip>
                </template>
              </v-text-field>
            </v-col>
          </v-row>
        </div>

        <!-- Warning for invalid offset range -->
        <v-alert
          v-if="hasOffsetWarning"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-4"
        >
          {{ t('exitCriteria.validation.startGreaterThanEnd', 'Start offset must be less than or equal to end offset').value }}
        </v-alert>
      </div>

      <div class="mt-4">
        <v-btn
          variant="text"
          color="error"
          :disabled="disabled"
          @click="clearCensorWindow"
        >
          {{ t('components.filterPanel.buttons.clear', 'Clear Censor Window').value }}
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { Period } from '@/models/cohort.types'
import type { ValidationError } from '@/models/validation.types'

const { t } = useI18n()

interface Props {
  modelValue?: Period | null
  disabled?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: Period | null]
  'validation-error': [errors: ValidationError[]]
}>()

// Local state
const localStartDateField = ref<'START_DATE' | 'END_DATE'>(
  props.modelValue?.startDate?.dateField || 'START_DATE'
)
const localStartOffset = ref<number>(
  props.modelValue?.startDate?.offset || 0
)
const localEndDateField = ref<'START_DATE' | 'END_DATE'>(
  props.modelValue?.endDate?.dateField || 'END_DATE'
)
const localEndOffset = ref<number>(
  props.modelValue?.endDate?.offset || 0
)

// Date field options
const dateFieldOptions = [
  { value: 'START_DATE', title: t('options.startDate', 'Start Date').value },
  { value: 'END_DATE', title: t('options.endDate', 'End Date').value }
]

// Validation
const offsetRule = (value: number) => {
  if (value === undefined || value === null) {
    return true
  }
  if (isNaN(value)) {
    return t('exitCriteria.validation.offsetRequired', 'Offset is required').value
  }
  return true
}

// Check for invalid offset range (warning only)
const hasOffsetWarning = computed(() => {
  if (localStartOffset.value !== undefined && localEndOffset.value !== undefined) {
    return localStartOffset.value > localEndOffset.value
  }
  return false
})

// Update functions
function updateStartDate() {
  emitUpdatedValue()
}

function updateEndDate() {
  emitUpdatedValue()
}

function emitUpdatedValue() {
  const value: Period = {
    startDate: {
      dateField: localStartDateField.value,
      offset: localStartOffset.value
    },
    endDate: {
      dateField: localEndDateField.value,
      offset: localEndOffset.value
    }
  }

  emit('update:modelValue', value)

  // Emit validation warnings if needed
  if (hasOffsetWarning.value) {
    const warnings: ValidationError[] = [{
      field: 'censorWindow.endDate.offset',
      message: t('exitCriteria.validation.startGreaterThanEnd', 'Start offset must be less than or equal to end offset').value,
      severity: 'warning'
    }]
    emit('validation-error', warnings)
  } else {
    emit('validation-error', [])
  }
}

function clearCensorWindow() {
  emit('update:modelValue', null)
  emit('validation-error', [])
}

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    localStartDateField.value = newValue.startDate?.dateField || 'START_DATE'
    localStartOffset.value = newValue.startDate?.offset || 0
    localEndDateField.value = newValue.endDate?.dateField || 'END_DATE'
    localEndOffset.value = newValue.endDate?.offset || 0
  }
}, { deep: true })
</script>

<style scoped>
.censor-window-editor {
  margin: 16px 0;
}

.date-config-section {
  padding: 8px 0;
}
</style>
