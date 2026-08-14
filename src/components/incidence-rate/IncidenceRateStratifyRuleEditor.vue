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
    <CriteriaGroup
      :group="currentGroup"
      :concept-sets="conceptSetOptions"
      @select-concept-set="onSelectConceptSet"
      @edit-concept-set="onSelectConceptSet"
    />

    <ConceptSetSelectionDialog
      v-model="csDialogOpen"
      @concept-set-selected="onConceptSetSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useCirceConceptSetPicker } from '@/composables/useCirceConceptSetPicker'
import CriteriaGroup from '@/components/circe/criteria/CriteriaGroup.vue'
import ConceptSetSelectionDialog from '@/components/cohort/ConceptSetSelectionDialog.vue'
import type { CriteriaGroup as CriteriaGroupType, ConceptSet } from '@/models/circe-types'
import type { StratifyRule } from '@/models/incidence-rate.types'

const { rule, conceptSets } = defineProps<{
  rule: StratifyRule
  conceptSets: ConceptSet[]
}>()
const emit = defineEmits<{
  (e: 'update', partial: Partial<StratifyRule>): void
  (e: 'add-concept-set', cs: ConceptSet): void
}>()
const { t } = useI18n()

// Local reactive copy of the expression group so CriteriaGroup can mutate
// it in-place.  Synced back to the parent via watch.
const currentGroup = reactive<CriteriaGroupType>(
  (rule.expression as CriteriaGroupType) ?? { Type: 'ALL', CriteriaList: [] },
)

watch(
  () => rule.expression,
  (next) => {
    const g = (next as CriteriaGroupType) ?? { Type: 'ALL', CriteriaList: [] }
    Object.assign(currentGroup, g)
  },
  { deep: true },
)

// Emit mutations whenever CriteriaGroup changes the reactive object.
watch(currentGroup, (g) => {
  emit('update', { expression: { ...g } })
}, { deep: true })

const { dialogOpen: csDialogOpen, conceptSetOptions, onSelectConceptSet, onConceptSetSelected: _onConceptSetSelected } =
  useCirceConceptSetPicker({
    getConceptSets: () => conceptSets,
    addConceptSet: (cs) => emit('add-concept-set', cs),
  })

async function onConceptSetSelected(cs: { id: number | string; name: string; items?: unknown[] }) {
  await _onConceptSetSelected(cs)
}
</script>

<style scoped>
.rule-editor {
  padding: 8px 12px;
}
</style>
