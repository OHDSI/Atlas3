<template>
  <div class="char-design-form">
    <v-text-field
      :model-value="draft.name"
      :label="t('columns.name', 'Name').value"
      density="compact"
      variant="outlined"
      hide-details="auto"
      required
      data-testid="char-design-name"
      @update:model-value="(v: string) => updateField('name', v)"
    />
    <v-textarea
      :model-value="draft.description ?? ''"
      :label="t('columns.description', 'Description').value"
      density="compact"
      variant="outlined"
      hide-details="auto"
      rows="2"
      auto-grow
      data-testid="char-design-description"
      @update:model-value="(v: string) => updateField('description', v)"
    />
    <v-switch
      :model-value="draft.strataOnly ?? false"
      :label="
        t('cc.viewEdit.design.subgroups.subgroupOnly', 'Compute strata only (skip overall)').value
      "
      density="compact"
      color="primary"
      hide-details
      data-testid="char-design-strataOnly"
      @update:model-value="(v: boolean | null) => updateField('strataOnly', !!v)"
    />

    <v-divider class="my-3" />

    <LinkedCohortPicker
      :model-value="draft.cohorts"
      :available-cohorts="availableCohorts"
      @update:model-value="v => updateField('cohorts', v)"
    />

    <v-divider class="my-3" />

    <LinkedFeatureAnalysisPicker
      :model-value="draft.featureAnalyses"
      :available-feature-analyses="availableFeatureAnalyses"
      @update:model-value="v => updateField('featureAnalyses', v)"
    />

    <v-divider class="my-3" />

    <StrataEditor
      :model-value="draft.stratas"
      @update:model-value="v => updateField('stratas', v)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
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

const { t } = useI18n()
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
