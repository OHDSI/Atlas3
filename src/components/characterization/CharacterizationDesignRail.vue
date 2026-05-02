<template>
  <aside class="char-design-rail">
    <CharacterizationDesignForm
      :model-value="modelValue"
      :available-cohorts="availableCohorts"
      :available-feature-analyses="availableFeatureAnalyses"
      @update:model-value="v => $emit('update:modelValue', v)"
    />

    <template v-if="showPastRuns">
      <div class="char-design-rail__sec-label">
        {{ t('cc.viewEdit.workbench.pastRuns', 'Past runs').value }}
      </div>
      <CharacterizationPastRuns
        :runs="runs"
        :active-id="activeRunId"
        @select="id => $emit('select-run', id)"
      />
    </template>
  </aside>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import CharacterizationDesignForm from './CharacterizationDesignForm.vue'
import CharacterizationPastRuns from './CharacterizationPastRuns.vue'
import type {
  CharacterizationDefinition,
  CharacterizationExecution,
} from '@/models/characterization.types'
import type { CohortDefinitionSummary } from '@/models/webapi.types'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

defineProps<{
  modelValue: CharacterizationDefinition
  availableCohorts: CohortDefinitionSummary[]
  availableFeatureAnalyses: FeatureAnalysisListItem[]
  runs: CharacterizationExecution[]
  activeRunId: number | null
  showPastRuns: boolean
}>()

defineEmits<{
  'update:modelValue': [value: CharacterizationDefinition]
  'select-run': [id: number]
}>()

const { t } = useI18n()
</script>

<style scoped>
.char-design-rail {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}
.char-design-rail__sec-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface));
  margin: 14px 0 6px;
}
</style>
