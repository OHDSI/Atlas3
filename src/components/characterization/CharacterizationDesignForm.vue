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
      :current-user-login="currentUserLogin"
      @update:model-value="v => updateField('featureAnalyses', v)"
    />

    <AtlasDivider class="my-3" />

    <StrataEditor
      :model-value="draft.stratas"
      :strata-only="draft.strataOnly ?? false"
      @update:model-value="v => updateField('stratas', v)"
      @update:strata-only="v => updateField('strataOnly', v)"
    />
  </div>
</template>

<script setup lang="ts">
import { AtlasDivider } from '@/components/ui'
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
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

// Sourced here rather than in the picker so the picker stays presentational and
// its consumers do not need a Pinia instance just to render a list.
const authStore = useAuthStore()
const currentUserLogin = computed(() => authStore.user?.login)

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
