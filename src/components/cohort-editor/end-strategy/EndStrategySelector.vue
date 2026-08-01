<template>
  <div class="end-strategy-selector">
    <div class="end-strategy-selector__strategy-row">
      <div class="end-strategy-selector__label">
        Strategy
      </div>
      <v-btn-toggle
        :model-value="currentStrategyType"
        mandatory
        variant="outlined"
        density="compact"
        divided
        class="end-strategy-selector__toggle"
        @update:model-value="changeStrategy"
      >
        <v-btn value="observation">
          Continuous Observation
        </v-btn>
        <v-btn value="dateOffset">
          Fixed Duration
        </v-btn>
        <v-btn value="customEra">
          Drug Exposure
        </v-btn>
      </v-btn-toggle>
    </div>

    <ObservationEndStrategy v-if="currentStrategyType === 'observation'" />

    <DateOffsetEndStrategy
      v-else-if="dateOffsetStrategy !== undefined"
      :strategy="dateOffsetStrategy"
    />

    <CustomEraEndStrategy
      v-else-if="customEraStrategy !== undefined"
      :strategy="customEraStrategy"
      :concept-sets="conceptSets"
      @select-concept-set="emit('select-concept-set', $event)"
      @edit-concept-set="emit('edit-concept-set', $event)"
      @clear-concept-set="emit('clear-concept-set')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DateOffsetStrategy, CustomEraStrategy, EndStrategy } from '../circe.types'
import type { ConceptSetOption, ConceptSetSelectionTarget } from '../criteria/criteria-editor.types'
import ObservationEndStrategy from './ObservationEndStrategy.vue'
import DateOffsetEndStrategy from './DateOffsetEndStrategy.vue'
import CustomEraEndStrategy from './CustomEraEndStrategy.vue'

type EndStrategyType = 'observation' | 'dateOffset' | 'customEra'

const props = defineProps<{
  endStrategy: EndStrategy | undefined
  conceptSets: ConceptSetOption[]
}>()

const emit = defineEmits<{
  'update:endStrategy': [value: EndStrategy | undefined]
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

const currentStrategyType = computed<EndStrategyType>(() => {
  if (!props.endStrategy) return 'observation'
  if ('DateOffset' in props.endStrategy) return 'dateOffset'
  return 'customEra'
})

const dateOffsetStrategy = computed((): DateOffsetStrategy | undefined => {
  if (props.endStrategy && 'DateOffset' in props.endStrategy) {
    return props.endStrategy.DateOffset
  }
  return undefined
})

const customEraStrategy = computed((): CustomEraStrategy | undefined => {
  if (props.endStrategy && 'CustomEra' in props.endStrategy) {
    return props.endStrategy.CustomEra
  }
  return undefined
})

function changeStrategy(type: string) {
  switch (type as EndStrategyType) {
    case 'observation':
      emit('update:endStrategy', undefined)
      break
    case 'dateOffset':
      emit('update:endStrategy', { DateOffset: { DateField: 'StartDate', Offset: 0 } })
      break
    case 'customEra':
      emit('update:endStrategy', { CustomEra: { GapDays: 30, Offset: 0, DaysSupplyOverride: 0 } })
      break
  }
}
</script>

<style scoped>
.end-strategy-selector__strategy-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.end-strategy-selector__label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-surface-variant));
  white-space: nowrap;
}

.end-strategy-selector__toggle :deep(.v-btn-toggle) {
  border-radius: 999px;
  overflow: hidden;
}

.end-strategy-selector__toggle :deep(.v-btn-toggle > .v-btn) {
  min-width: 0;
  border-radius: 0 !important;
  min-height: 28px;
  padding-inline: 12px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.end-strategy-selector__toggle :deep(.v-btn-toggle > .v-btn:first-child) {
  border-top-left-radius: 999px !important;
  border-bottom-left-radius: 999px !important;
}

.end-strategy-selector__toggle :deep(.v-btn-toggle > .v-btn:last-child) {
  border-top-right-radius: 999px !important;
  border-bottom-right-radius: 999px !important;
}
</style>
