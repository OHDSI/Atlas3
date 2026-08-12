<template>
  <div class="end-strategy-selector">
    <div class="end-strategy-selector__strategy-row">
      <div class="end-strategy-selector__label">
        Strategy
      </div>
      <div class="end-strategy-selector__toggle">
        <AtlasButton
          :variant="currentStrategyType === 'observation' ? 'tonal' : 'secondary'"
          size="sm"
          @click="changeStrategy('observation')"
        >
          Continuous Observation
        </AtlasButton>
        <AtlasButton
          :variant="currentStrategyType === 'dateOffset' ? 'tonal' : 'secondary'"
          size="sm"
          @click="changeStrategy('dateOffset')"
        >
          Fixed Duration
        </AtlasButton>
        <AtlasButton
          :variant="currentStrategyType === 'customEra' ? 'tonal' : 'secondary'"
          size="sm"
          @click="changeStrategy('customEra')"
        >
          Drug Exposure
        </AtlasButton>
      </div>
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
import { AtlasButton } from '@/components/ui'
import type { DateOffsetStrategy, CustomEraStrategy, EndStrategy } from '../circe.types'
import type { ConceptSetOption, ConceptSetSelectionTarget } from '../criteria/criteria-editor.types'
import ObservationEndStrategy from './ObservationEndStrategy.vue'
import DateOffsetEndStrategy from './DateOffsetEndStrategy.vue'
import CustomEraEndStrategy from './CustomEraEndStrategy.vue'

type EndStrategyType = 'observation' | 'dateOffset' | 'customEra'

const props = defineProps<{
  endStrategy: EndStrategy | null | undefined
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

.end-strategy-selector__toggle {
  display: inline-flex;
  border-radius: 999px;
  overflow: hidden;
}

.end-strategy-selector__toggle :deep(.atlas-button) {
  min-width: 0;
  min-height: 28px;
  padding-inline: 12px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}
</style>
