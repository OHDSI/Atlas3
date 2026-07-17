<template>
  <div class="event-persistence-selector">
    <div class="event-persistence-selector__body">
      <!-- Strategy Selector -->
      <div class="strategy-selector mb-4">
        <div class="strategy-selector__label">
          {{ tv('components.common.strategy', 'Strategy') }}
        </div>
        <div class="strategy-selector__buttons">
          <AtlasButton
            :variant="modelValue.strategy === 'CONTINUOUS_OBSERVATION' ? 'tonal' : 'secondary'"
            :tone="modelValue.strategy === 'CONTINUOUS_OBSERVATION' ? undefined : 'neutral'"
            size="sm"
            :disabled="disabled"
            @click="changeStrategy('CONTINUOUS_OBSERVATION')"
          >
            {{ tv('options.endOfContinuousObservation', 'Continuous Observation') }}
          </AtlasButton>
          <AtlasButton
            :variant="modelValue.strategy === 'FIXED_DURATION' ? 'tonal' : 'secondary'"
            :tone="modelValue.strategy === 'FIXED_DURATION' ? undefined : 'neutral'"
            size="sm"
            :disabled="disabled"
            @click="changeStrategy('FIXED_DURATION')"
          >
            {{ tv('components.dateOffsetStrategy.dateOffsetStrategyText_1', 'Fixed Duration') }}
          </AtlasButton>
          <AtlasButton
            :variant="modelValue.strategy === 'CONTINUOUS_DRUG' ? 'tonal' : 'secondary'"
            :tone="modelValue.strategy === 'CONTINUOUS_DRUG' ? undefined : 'neutral'"
            size="sm"
            :disabled="disabled"
            @click="changeStrategy('CONTINUOUS_DRUG')"
          >
            {{ tv('components.customEraStrategy.customEraStrategyText_1', 'Drug Exposure') }}
          </AtlasButton>
        </div>
      </div>

      <!-- Strategy-specific Component -->
      <ObservationStrategy
        v-if="modelValue.strategy === 'CONTINUOUS_OBSERVATION'"
        :disabled="disabled"
      />
      <FixedDurationStrategy
        v-else-if="modelValue.strategy === 'FIXED_DURATION'"
        :strategy="modelValue"
        :disabled="disabled"
      />
      <DrugExposureStrategy
        v-else-if="modelValue.strategy === 'CONTINUOUS_DRUG'"
        :strategy="modelValue"
        :disabled="disabled"
        @select-drug-concept-set="$emit('select-drug-concept-set')"
        @edit-drug-concept-set="$emit('edit-drug-concept-set', $event)"
      />
    </div>

    <!-- Validation errors -->
    <div
      v-if="validationErrors.length > 0"
      class="event-persistence-selector__validation"
    >
      <div class="event-persistence-selector__validation-header">
        <AtlasIcon
          icon="mdi-alert-circle-outline"
          size="18"
          class="event-persistence-selector__validation-icon"
        />
        <span class="event-persistence-selector__validation-title">
          {{ tv('common.validationErrors', 'Validation errors') }}
        </span>
      </div>
      <ul class="event-persistence-selector__validation-list">
        <li
          v-for="error in validationErrors"
          :key="error.field"
        >
          <strong>{{ error.field }}:</strong> {{ error.message }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasIcon } from '@/components/ui'
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import FixedDurationStrategy from './FixedDurationStrategy.vue'
import DrugExposureStrategy from './DrugExposureStrategy.vue'
import ObservationStrategy from './ObservationStrategy.vue'
import type { ExitCriteria, ExitStrategy } from '@/models/cohort.types'
import type { ValidationError } from '@/models/validation.types'

const { tv } = useI18n()

interface Props {
  modelValue: ExitCriteria
  disabled?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: ExitCriteria]
  'validation-error': [errors: ValidationError[]]
  'select-drug-concept-set': []
  'edit-drug-concept-set': [conceptSet: { id: number | string; name: string; items?: unknown[] }]
}>()

// Change strategy - initialize with default values for the new strategy
function changeStrategy(newStrategy: ExitStrategy) {
  const updated: ExitCriteria =
    newStrategy === 'CONTINUOUS_OBSERVATION'
      ? { strategy: 'CONTINUOUS_OBSERVATION' }
      : newStrategy === 'FIXED_DURATION'
        ? { strategy: 'FIXED_DURATION', dateField: 'START_DATE', offset: 0 }
        : {
            strategy: 'CONTINUOUS_DRUG',
            persistenceWindow: 30,
            offset: 0,
            surveillanceWindow: 7,
          }

  emit('update:modelValue', updated)
  validateFields(updated)
}

// Validate fields based on strategy
function validateFields(exitCriteria: ExitCriteria) {
  const errors: ValidationError[] = []

  if (exitCriteria.strategy === 'FIXED_DURATION') {
    if (exitCriteria.offset === undefined) {
      errors.push({
        field: 'exitCriteria.offset',
        message: tv(
          'exitCriteria.validation.offsetRequired',
          'Offset is required for fixed duration strategy'
        ),
        severity: 'error',
      })
    }
  }

  if (exitCriteria.strategy === 'CONTINUOUS_DRUG') {
    if (!exitCriteria.conceptSet || exitCriteria.conceptSet.id == null) {
      errors.push({
        field: 'exitCriteria.conceptSet',
        message: tv(
          'exitCriteria.validation.conceptSetRequired',
          'Drug concept set required for this strategy'
        ),
        severity: 'warning',
      })
    }
  }

  emit('validation-error', errors)
}

// Compute validation errors
const validationErrors = computed(() => {
  const errors: ValidationError[] = []

  if (props.modelValue.strategy === 'FIXED_DURATION') {
    if (props.modelValue.offset === undefined) {
      errors.push({
        field: 'exitCriteria.offset',
        message: tv(
          'exitCriteria.validation.offsetRequired',
          'Offset is required for fixed duration strategy'
        ),
        severity: 'error',
      })
    }
  }

  if (props.modelValue.strategy === 'CONTINUOUS_DRUG') {
    if (!props.modelValue.conceptSet || props.modelValue.conceptSet.id == null) {
      errors.push({
        field: 'exitCriteria.conceptSet',
        message: tv(
          'exitCriteria.validation.conceptSetRequired',
          'Drug concept set required for this strategy'
        ),
        severity: 'warning',
      })
    }
  }

  return errors
})
</script>

<style scoped>
.event-persistence-selector {
  margin: 0;
}

.event-persistence-selector__body {
  padding: 12px 16px;
}

.strategy-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.strategy-selector__label {
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface-variant));
}

.strategy-selector__buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.event-persistence-selector__validation {
  margin-top: 16px;
  padding: 12px;
  border-radius: 4px;
  background: rgba(var(--v-theme-error), 0.1);
  border-left: 3px solid rgb(var(--v-theme-error));
}

.event-persistence-selector__validation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.event-persistence-selector__validation-icon {
  color: rgb(var(--v-theme-error));
  flex-shrink: 0;
}

.event-persistence-selector__validation-title {
  font-weight: 500;
  color: rgb(var(--v-theme-error));
  font-size: 13px;
}

.event-persistence-selector__validation-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface));
}

.event-persistence-selector__validation-list li {
  margin-bottom: 4px;
}

.event-persistence-selector__validation-list li:last-child {
  margin-bottom: 0;
}

.mb-4 {
  margin-bottom: 16px;
}
</style>

