<template>
  <div class="char-design-form">
    <LinkedCohortPicker
      :model-value="draft.cohorts"
      :available-cohorts="availableCohorts"
      @update:model-value="v => updateField('cohorts', v)"
    />

    <AtlasDivider class="my-3" />

    <LinkedFeatureAnalysisPicker
      :model-value="draft.featureAnalyses"
      :available-feature-analyses="availableFeatureAnalyses"
      @update:model-value="v => updateField('featureAnalyses', v)"
    />

    <AtlasDivider class="my-3" />

    <StrataEditor
      :model-value="draft.stratas"
      :strata-only="draft.strataOnly ?? false"
      :strata-concept-sets="draft.strataConceptSets ?? []"
      @update:model-value="v => updateField('stratas', v)"
      @update:strata-only="v => updateField('strataOnly', v)"
      @update:strata-concept-sets="v => updateField('strataConceptSets', v)"
    />
  </div>
</template>

<script setup lang="ts">
import { AtlasDivider } from '@/components/ui'
import { computed } from 'vue'
import LinkedCohortPicker from './LinkedCohortPicker.vue'
import LinkedFeatureAnalysisPicker from './LinkedFeatureAnalysisPicker.vue'
import StrataEditor from './StrataEditor.vue'
import type { CharacterizationDefinition } from '@/models/characterization.types'
import type { CohortDefinitionSummary } from '@/models/webapi.types'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

const props = defineProps<{
  modelValue: CharacterizationDefinition
  availableCohorts: CohortDefinitionSummary[]
  availableFeatureAnalyses: FeatureAnalysisListItem[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: CharacterizationDefinition] }>()

const draft = computed<CharacterizationDefinition>(() => props.modelValue)

function updateField<K extends keyof CharacterizationDefinition>(
  key: K,
  value: CharacterizationDefinition[K]
) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<style scoped>
.char-design-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
