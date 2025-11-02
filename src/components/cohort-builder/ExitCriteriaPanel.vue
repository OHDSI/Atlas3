<template>
  <v-card class="exit-criteria-panel">
    <v-card-title class="text-h6">Exit Criteria</v-card-title>
    <v-card-text>
      <!-- Exit Strategy Selector -->
      <v-select
        :model-value="modelValue?.strategy || 'CONTINUOUS_OBSERVATION'"
        :items="exitStrategies"
        item-title="label"
        item-value="value"
        label="Exit Strategy"
        data-testid="exit-strategy-selector"
        @update:model-value="updateStrategy"
      />

      <!-- Fixed Duration Offset -->
      <v-text-field
        v-if="modelValue?.strategy === 'FIXED_DURATION'"
        :model-value="modelValue.offset"
        type="number"
        label="Duration (days)"
        data-testid="exit-offset-input"
        @update:model-value="updateOffset"
      />

      <!-- Custom Event -->
      <div v-if="modelValue?.strategy === 'CUSTOM_EVENT'">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-plus"
          data-testid="add-censoring-event"
          @click="addCensoringEvent"
        >
          Add Censoring Event
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { ExitCriteria } from '@/models/cohort.types'

interface Props {
  modelValue?: ExitCriteria
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: ExitCriteria]
}>()

const exitStrategies = [
  { value: 'CONTINUOUS_OBSERVATION', label: 'Continuous Observation - Exit when observation ends' },
  { value: 'FIXED_DURATION', label: 'Fixed Duration - Exit after fixed days' },
  { value: 'CUSTOM_EVENT', label: 'Custom Event - Exit on specific event' },
]

function updateStrategy(strategy: string) {
  emit('update:modelValue', { strategy: strategy as any })
}

function updateOffset(offset: string) {
  emit('update:modelValue', { ...props.modelValue!, offset: parseInt(offset) })
}

function addCensoringEvent() {
  // Placeholder
}
</script>
