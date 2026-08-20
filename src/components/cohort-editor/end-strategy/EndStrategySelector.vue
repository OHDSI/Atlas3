<template>
  <div class="end-strategy-selector">
    <div class="end-strategy-selector__strategy-row">
      <div class="end-strategy-selector__label">
        Strategy
      </div>
      <v-btn-toggle
        :model-value="currentStrategyType"
        mandatory
        density="compact"
        variant="outlined"
        divided
        class="end-strategy-selector__toggle"
        @update:model-value="changeStrategy"
      >
        <AtlasButton
          toggle
          value="observation"
          size="sm"
        >
          Continuous Observation
        </AtlasButton>
        <AtlasButton
          toggle
          value="dateOffset"
          size="sm"
        >
          Fixed Duration
        </AtlasButton>
        <AtlasButton
          toggle
          value="customEra"
          size="sm"
        >
          Drug Exposure
        </AtlasButton>
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
import { AtlasButton } from '@/components/ui'
import type { DateOffsetStrategy, CustomEraStrategy, EndStrategy } from '@/models/circe-types'
import type { ConceptSetOption, ConceptSetSelectionTarget } from '@/components/circe/criteria/criteria-editor.types'
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

function changeStrategy(type: EndStrategyType | null) {
  switch (type) {
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
  border-radius: 999px;
  overflow: hidden;
}

.end-strategy-selector__toggle :deep(.v-btn-toggle > .v-btn) {
  min-width: 0;
  border-radius: 0 !important;
  min-height: 28px;
  padding-inline: 10px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.end-strategy-selector__toggle :deep(.v-btn-toggle .v-btn) {
  border-radius: 999px !important;
  border: 0 !important;
  min-width: 0;
  padding: 0 12px;
  height: 26px !important;
  background: transparent !important;
  color: rgb(var(--v-theme-on-surface-variant));
  font-weight: 500;
  letter-spacing: 0.02em;
}

.end-strategy-selector__toggle :deep(.v-btn-toggle .v-btn:hover:not(.v-btn--active)) {
  color: rgb(var(--v-theme-on-surface));
}

.end-strategy-selector__toggle :deep(.v-btn-toggle .v-btn--active) {
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
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
