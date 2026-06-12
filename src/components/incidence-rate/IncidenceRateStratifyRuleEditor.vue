<template>
  <div class="rule-editor">
    <AtlasTextField
      :model-value="rule.name ?? ''"
      :label="t('incidenceRate.stratifyName', 'Rule name').value"
      hide-details
      class="mb-2"
      @update:model-value="(v) => emit('update', { name: String(v) })"
    />
    <AtlasTextField
      :model-value="rule.description ?? ''"
      :label="t('columns.description', 'Description').value"
      hide-details
      class="mb-3"
      @update:model-value="(v) => emit('update', { description: String(v) })"
    />
    <CriteriaGroupEditor
      :model-value="currentGroup"
      @update:model-value="(g: CriteriaGroup) => emit('update', { expression: g })"
      @select-concept-set="onSelectConceptSet"
      @select-concept="onSelectConcept"
    />

    <ConceptSetSelectionDialog
      v-model="conceptSetDialogOpen"
      @concept-set-selected="onConceptSetSelected"
    />

    <ConceptSearchDialog
      v-model="conceptSearchDialogOpen"
      :domain-filter="conceptSearchDomainFilter"
      @concepts-selected="onConceptsSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { AtlasTextField } from '@/components/ui'
import { computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import { useCriteriaGroupPicker } from '@/composables/useCriteriaGroupPicker'
import CriteriaGroupEditor from '@/components/cohort-builder/CriteriaGroupEditor.vue'
import ConceptSetSelectionDialog from '@/components/cohort/ConceptSetSelectionDialog.vue'
import ConceptSearchDialog from '@/components/cohort/ConceptSearchDialog.vue'
import type { CriteriaGroup } from '@/models/cohort.types'
import type { StratifyRule } from '@/models/incidence-rate.types'

const { rule } = defineProps<{ rule: StratifyRule }>()
const emit = defineEmits<{ (e: 'update', partial: Partial<StratifyRule>): void }>()
const { t } = useI18n()

const defaultGroup = computed<CriteriaGroup>(() => ({
  id: uuidv4(),
  logicType: 'ALL',
  events: [],
}))

const currentGroup = computed<CriteriaGroup>(
  () => (rule.expression as CriteriaGroup) ?? defaultGroup.value,
)

// Concept-set / concept picking for the embedded CriteriaGroupEditor, shared
// with the characterization strata editor so nested-child targeting (#93) is
// handled in one place.
const {
  conceptSetDialogOpen,
  conceptSearchDialogOpen,
  conceptSearchDomainFilter,
  onSelectConceptSet,
  onSelectConcept,
  onConceptSetSelected,
  onConceptsSelected,
} = useCriteriaGroupPicker({
  getGroup: () => currentGroup.value,
  onUpdate: (g: CriteriaGroup) => emit('update', { expression: g }),
})
</script>

<style scoped>
.rule-editor {
  padding: 8px 12px;
}
</style>
