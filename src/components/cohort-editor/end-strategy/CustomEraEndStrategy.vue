<template>
  <div class="custom-era-end-strategy">
    <div class="strategy-hint">
      <AtlasIcon
        size="16"
        class="strategy-hint__icon"
      >
        mdi-information-outline
      </AtlasIcon>
      <span>Cohort exit is based on continuous drug exposure, allowing configurable gaps between exposures.</span>
    </div>

    <div class="custom-era-end-strategy__concept-set mt-4">
      <AtlasButton
        v-if="drugConceptSet === undefined"
        variant="secondary"
        size="sm"
        prepend-icon="mdi-plus"
        @click="emit('select-concept-set', selectionTarget)"
      >
        Select Drug Concept Set
      </AtlasButton>

      <AtlasChip
        v-else
        closable
        color="primary"
        variant="elevated"
        style="cursor: pointer"
        @click="emit('edit-concept-set', selectionTarget)"
        @click:close="clearConceptSet"
      >
        {{ drugConceptSet.name }}
      </AtlasChip>
    </div>

    <template v-if="drugConceptSet !== undefined">
      <div class="custom-era-end-strategy__fields mt-4">
        <AtlasTextField
          v-model.number="gapDays"
          type="number"
          label="Gap Days"
          variant="outlined"
          density="compact"
          hide-details
          min="0"
        />

        <AtlasTextField
          v-model.number="offset"
          type="number"
          label="Offset (days)"
          variant="outlined"
          density="compact"
          hide-details
          min="0"
        />

        <AtlasTextField
          v-model.number="daysSupplyOverride"
          type="number"
          label="Days Supply Override"
          variant="outlined"
          density="compact"
          hide-details
          min="0"
        />
      </div>

      <div class="strategy-hint strategy-hint--secondary mt-3">
        <AtlasIcon
          size="16"
          class="strategy-hint__icon"
        >
          mdi-information-outline
        </AtlasIcon>
        <span>If days supply is missing from the records, the system assumes 1 day per exposure.</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import {
  AtlasButton,
  AtlasChip,
  AtlasIcon,
  AtlasTextField,
} from '@/components/ui'
import type { CustomEraStrategy } from '@/models/circe-types'
import type { ConceptSetOption, ConceptSetSelectionTarget } from '@/components/circe/criteria/criteria-editor.types'

const props = defineProps<{
  strategy: CustomEraStrategy
  conceptSets: ConceptSetOption[]
}>()

const emit = defineEmits<{
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

// Direct ref into strategy.DrugCodesetId — same pattern as EventConceptSet.vue
const selectionTarget: ConceptSetSelectionTarget = {
  targetRef: toRef(props.strategy, 'DrugCodesetId'),
}

const drugConceptSet = computed(() =>
  props.strategy.DrugCodesetId !== undefined
    ? props.conceptSets.find(cs => cs.id === props.strategy.DrugCodesetId)
    : undefined
)

const gapDays = computed<number>({
  get: () => props.strategy.GapDays ?? 0,
  set: value => {
    props.strategy.GapDays = Number(value) || 0
  },
})

const offset = computed<number>({
  get: () => props.strategy.Offset ?? 0,
  set: value => {
    props.strategy.Offset = Number(value) || 0
  },
})

const daysSupplyOverride = computed<number>({
  get: () => props.strategy.DaysSupplyOverride ?? 0,
  set: value => {
    props.strategy.DaysSupplyOverride = Number(value) || 0
  },
})

function clearConceptSet() {
  props.strategy.DrugCodesetId = undefined
  emit('clear-concept-set')
}
</script>

<style scoped>
.custom-era-end-strategy {
  padding: 14px 0 6px;
}

.strategy-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
}

.strategy-hint--secondary {
  margin-top: 4px;
}

.strategy-hint__icon {
  color: rgb(var(--v-theme-primary));
  opacity: 0.7;
  flex-shrink: 0;
  margin-top: 2px;
}

.custom-era-end-strategy__fields {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.custom-era-end-strategy__fields .v-text-field {
  max-width: 180px;
}
</style>
