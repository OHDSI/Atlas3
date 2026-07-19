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
      <component
        :is="currentStrategyComponent"
        :strategy="modelValue"
        :disabled="disabled"
        @validation-error="$emit('validation-error', $event)"
        @select-drug-concept-set="$emit('select-drug-concept-set')"
        @edit-drug-concept-set="$emit('edit-drug-concept-set', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { AtlasButton } from '@/components/ui'
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

// Strategy component lookup
const strategyComponents: Record<ExitStrategy, Component> = {
  'CONTINUOUS_OBSERVATION': ObservationStrategy,
  'FIXED_DURATION': FixedDurationStrategy,
  'CONTINUOUS_DRUG': DrugExposureStrategy,
}

// Compute the current strategy component based on modelValue.strategy
const currentStrategyComponent = computed(() => {
  return strategyComponents[props.modelValue.strategy]
})

// Change strategy - initialize with default values for the new strategy
function changeStrategy(newStrategy: ExitStrategy) {
  let updated: ExitCriteria

  switch (newStrategy) {
    case 'CONTINUOUS_OBSERVATION':
      updated = { strategy: 'CONTINUOUS_OBSERVATION' }
      break
    case 'FIXED_DURATION':
      updated = { strategy: 'FIXED_DURATION', dateField: 'START_DATE', offset: 0 }
      break
    case 'CONTINUOUS_DRUG':
      updated = {
        strategy: 'CONTINUOUS_DRUG',
        persistenceWindow: 30,
        offset: 0,
        surveillanceWindow: 7,
      }
      break
    default:
      // Emit validation error for unknown strategy type
      emit('validation-error', [
        {
          field: 'strategy',
          message: `Unknown strategy type: ${String(newStrategy)}`,
          severity: 'error',
        },
      ])
      return
  }

  emit('update:modelValue', updated)
  // Emit empty validation errors to clear prior strategy's errors
  emit('validation-error', [])
}

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

