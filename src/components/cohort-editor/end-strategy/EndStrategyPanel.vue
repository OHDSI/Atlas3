<template>
  <div class="end-strategy-panel">
    <div class="end-strategy-panel__section">
      <EndStrategySelector
        :end-strategy="expression.EndStrategy"
        :concept-sets="conceptSets"
        @update:end-strategy="expression.EndStrategy = $event"
        @select-concept-set="emit('select-concept-set', $event)"
        @edit-concept-set="emit('edit-concept-set', $event)"
        @clear-concept-set="emit('clear-concept-set')"
      />
    </div>

    <div class="end-strategy-panel__divider" />

    <div class="end-strategy-panel__section">
      <CensoringCriteriaEditor
        :model-value="expression.CensoringCriteria ?? []"
        :concept-sets="conceptSets"
        @update:model-value="expression.CensoringCriteria = $event"
        @select-concept-set="emit('select-concept-set', $event)"
        @edit-concept-set="emit('edit-concept-set', $event)"
        @clear-concept-set="emit('clear-concept-set')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CohortExpression } from '../circe.types'
import type { ConceptSetOption, ConceptSetSelectionTarget } from '../criteria/criteria-editor.types'
import EndStrategySelector from './EndStrategySelector.vue'
import CensoringCriteriaEditor from './CensoringCriteriaEditor.vue'

defineProps<{
  expression: CohortExpression
  conceptSets: ConceptSetOption[]
}>()

const emit = defineEmits<{
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()
</script>

<style scoped>
.end-strategy-panel {
  display: block;
}

.end-strategy-panel__section {
  padding: 12px 20px 16px;
}

.end-strategy-panel__divider {
  height: 1px;
  background: rgb(var(--v-theme-outline-variant));
  margin: 0 20px;
}
</style>
