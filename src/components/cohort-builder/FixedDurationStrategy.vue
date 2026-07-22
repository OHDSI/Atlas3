<template>
  <div class="fixed-duration-strategy">
    <!-- Strategy-specific help text -->
    <div class="strategy-hint">
      <AtlasIcon
        icon="mdi-information-outline"
        size="16"
        class="strategy-hint-icon"
      />
      <span>{{
        tv(
          'components.dateOffsetStrategy.dateOffsetStrategyText_2',
          'Event persists for a specified number of days from start or end date'
        )
      }}</span>
    </div>

    <!-- Fixed Duration Fields -->
    <AtlasRow class="mt-4">
      <AtlasCol cols="6">
        <AtlasSelect
          v-model="strategy.dateField"
          :items="dateFieldOptions"
          :label="
            tv('components.dateOffsetStrategy.dateOffsetStrategyText_3', 'Date Field')
          "
          :disabled="disabled"
          variant="outlined"
        />
      </AtlasCol>
      <AtlasCol cols="6">
        <AtlasTextField
          v-model.number="strategy.offset"
          :label="
            tv('components.dateOffsetStrategy.dateOffsetStrategyText_4', 'Offset (days)')
          "
          :disabled="disabled"
          :rules="[nonNegativeRule]"
          variant="outlined"
        />
      </AtlasCol>
    </AtlasRow>
  </div>
</template>

<script setup lang="ts">
import { AtlasIcon, AtlasRow, AtlasCol, AtlasSelect, AtlasTextField } from '@/components/ui'
import { watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { ExitCriteria } from '@/models/cohort.types'
import type { ValidationError } from '@/models/validation.types'

const { tv } = useI18n()

interface Props {
  strategy: ExitCriteria
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  'validation-error': [errors: ValidationError[]]
}>()

// Date field options
const dateFieldOptions = [
  { value: 'START_DATE', title: tv('columns.startDate', 'Start Date') },
  { value: 'END_DATE', title: tv('columns.endDate', 'End Date') },
]

// A cleared numeric field bound with `v-model.number` yields '' (or NaN), not
// undefined, so an empty offset must be treated as "not provided" rather than a
// valid value that silently passes both checks below.
function isBlank(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (value as unknown) === '' ||
    (typeof value === 'number' && Number.isNaN(value))
  )
}

// Reusable validation helper
function checkNonNegative(value: number | undefined): boolean {
  return isBlank(value) || (value as number) >= 0
}

// Collect all validation errors for this strategy
function getValidationErrors(): ValidationError[] {
  const errors: ValidationError[] = []

  // Check 1: offset required
  if (isBlank(props.strategy.offset)) {
    errors.push({
      field: 'exitCriteria.offset',
      message: tv(
        'exitCriteria.validation.offsetRequired',
        'Offset is required for fixed duration strategy'
      ),
      severity: 'error',
    })
  } 
  // Check 2: offset non-negative
  else if (!checkNonNegative(props.strategy.offset)) {
    errors.push({
      field: 'exitCriteria.offset',
      message: tv(
        'exitCriteria.validation.offsetNonNegative',
        'Offset values must be non-negative'
      ),
      severity: 'error',
    })
  }

  return errors
}

// Watch strategy object for changes and emit all validation errors
watch(
  () => props.strategy,
  () => {
    emit('validation-error', getValidationErrors())
  },
  { immediate: true, deep: true }
)

// Validation rule for Vuetify field
const nonNegativeRule = (value: number) => {
  if (!checkNonNegative(value)) {
    return tv('exitCriteria.validation.offsetNonNegative', 'Offset values must be non-negative')
  }
  return true
}
</script>

<style scoped>
.fixed-duration-strategy {
  padding: 12px 16px;
}

.strategy-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
}

.strategy-hint-icon {
  color: rgb(var(--v-theme-primary));
  opacity: 0.7;
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
