<template>
  <aside class="char-design-rail">
    <CharacterizationDesignForm
      :model-value="modelValue"
      :available-cohorts="availableCohorts"
      :available-feature-analyses="availableFeatureAnalyses"
      @update:model-value="v => $emit('update:modelValue', v)"
    />
  </aside>
</template>

<script setup lang="ts">
import CharacterizationDesignForm from './CharacterizationDesignForm.vue'
import type { CharacterizationDefinition } from '@/models/characterization.types'
import type { CohortDefinitionSummary } from '@/models/webapi.types'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

defineProps<{
  modelValue: CharacterizationDefinition
  availableCohorts: CohortDefinitionSummary[]
  availableFeatureAnalyses: FeatureAnalysisListItem[]
}>()

defineEmits<{
  'update:modelValue': [value: CharacterizationDefinition]
}>()
</script>

<style scoped>
.char-design-rail {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}
.char-design-rail :deep(.v-field__input),
.char-design-rail :deep(.v-select__selection-text) {
  font-size: 13px;
  min-height: 32px;
}
.char-design-rail :deep(.v-field--variant-outlined .v-field__input) {
  padding-top: 4px;
  padding-bottom: 4px;
}
.char-design-rail :deep(.v-label) {
  font-size: 12px;
  font-weight: 500;
}
.char-design-rail :deep(.v-list-item-title) {
  font-size: 13px;
  font-weight: 500;
}
</style>
