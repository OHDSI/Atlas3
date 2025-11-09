<template>
  <div class="exit-criteria-panel">
    <div class="panel-content">
      <!-- Exit Strategy Selector -->
      <v-select
        :model-value="modelValue?.strategy || 'CONTINUOUS_OBSERVATION'"
        :items="exitStrategies"
        item-title="label"
        item-value="value"
        :label="t('common.exitStrategy', 'Exit Strategy').value"
        data-testid="exit-strategy-selector"
        @update:model-value="updateStrategy"
      />

      <!-- Fixed Duration Offset -->
      <v-text-field
        v-if="modelValue?.strategy === 'FIXED_DURATION'"
        :model-value="modelValue.offset"
        type="number"
        :label="t('common.durationDays', 'Duration (days)').value"
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
          {{ t('components.cohortExpressionEditor.addCensoringEvent', 'Add Censoring Event') }}
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { ExitCriteria } from '@/models/cohort.types'

const { t } = useI18n()

interface Props {
  modelValue?: ExitCriteria
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: ExitCriteria]
}>()

const exitStrategies = [
  { value: 'CONTINUOUS_OBSERVATION', label: t('options.endOfContinuousObservation', 'Continuous Observation - Exit when observation ends').value },
  { value: 'FIXED_DURATION', label: t('options.fixedDurationRelativeToInitialEvent', 'Fixed Duration - Exit after fixed days').value },
  { value: 'CUSTOM_EVENT', label: t('common.customEvent', 'Custom Event - Exit on specific event').value },
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

<style scoped>
.exit-criteria-panel {
  background: white;
}

.panel-content {
  padding: 16px;
}
</style>
