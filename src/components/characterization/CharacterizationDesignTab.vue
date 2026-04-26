<!--
  CharacterizationDesignTab

  Top-level Design tab for the characterization builder. Composes the
  metadata fields, linked-cohort and linked-feature-analysis pickers, and
  the strata editor against a single CharacterizationDefinition draft via
  v-model.
-->
<template>
  <div class="char-design-tab">
    <!-- Metadata -->
    <section class="char-design-tab__section">
      <h2 class="char-design-tab__section-title">
        {{ t('characterizations.editor.metadata.name', 'Name') }}
      </h2>
      <v-text-field
        :model-value="draft.name"
        :label="t('characterizations.editor.metadata.name', 'Name').value"
        density="comfortable"
        variant="outlined"
        required
        data-testid="char-design-name"
        @update:model-value="(value: string) => updateField('name', value)"
      />
      <v-textarea
        :model-value="draft.description ?? ''"
        :label="t('characterizations.editor.metadata.description', 'Description').value"
        density="comfortable"
        variant="outlined"
        rows="2"
        auto-grow
        data-testid="char-design-description"
        @update:model-value="(value: string) => updateField('description', value)"
      />
      <v-row>
        <v-col
          cols="12"
          md="8"
        >
          <v-text-field
            :model-value="draft.stratifiedBy ?? ''"
            :label="t('characterizations.editor.metadata.stratifiedBy', 'Stratified by').value"
            density="comfortable"
            variant="outlined"
            data-testid="char-design-stratifiedBy"
            @update:model-value="(value: string) => updateField('stratifiedBy', value)"
          />
        </v-col>
        <v-col
          cols="12"
          md="4"
          class="d-flex align-center"
        >
          <v-switch
            :model-value="draft.strataOnly ?? false"
            :label="t('characterizations.editor.metadata.strataOnly', 'Compute strata only (skip overall)').value"
            density="comfortable"
            color="primary"
            hide-details
            data-testid="char-design-strataOnly"
            @update:model-value="(value: boolean | null) => updateField('strataOnly', !!value)"
          />
        </v-col>
      </v-row>
    </section>

    <v-divider class="my-4" />

    <!-- Cohorts -->
    <section class="char-design-tab__section">
      <LinkedCohortPicker
        :model-value="draft.cohorts"
        :available-cohorts="availableCohorts"
        @update:model-value="(value: LinkedCohort[]) => updateField('cohorts', value)"
      />
    </section>

    <v-divider class="my-4" />

    <!-- Feature analyses -->
    <section class="char-design-tab__section">
      <LinkedFeatureAnalysisPicker
        :model-value="draft.featureAnalyses"
        :available-feature-analyses="availableFeatureAnalyses"
        @update:model-value="(value: LinkedFeatureAnalysis[]) => updateField('featureAnalyses', value)"
      />
    </section>

    <v-divider class="my-4" />

    <!-- Strata -->
    <section class="char-design-tab__section">
      <StrataEditor
        :model-value="draft.stratas"
        @update:model-value="(value: Stratum[]) => updateField('stratas', value)"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@/composables/useI18n'
import LinkedCohortPicker from './LinkedCohortPicker.vue'
import LinkedFeatureAnalysisPicker from './LinkedFeatureAnalysisPicker.vue'
import StrataEditor from './StrataEditor.vue'
import type {
  CharacterizationDefinition,
  LinkedCohort,
  LinkedFeatureAnalysis,
  Stratum,
} from '@/models/characterization.types'
import type { CohortDefinitionSummary } from '@/models/webapi.types'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

const props = defineProps<{
  modelValue: CharacterizationDefinition
  availableCohorts: CohortDefinitionSummary[]
  availableFeatureAnalyses: FeatureAnalysisListItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CharacterizationDefinition]
}>()

const { t } = useI18n()

const draft = computed<CharacterizationDefinition>(() => props.modelValue)

function updateField<K extends keyof CharacterizationDefinition>(
  key: K,
  value: CharacterizationDefinition[K]
) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}
</script>

<style scoped>
.char-design-tab {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
}

.char-design-tab__section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.char-design-tab__section-title {
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0 0 8px 0;
}
</style>
