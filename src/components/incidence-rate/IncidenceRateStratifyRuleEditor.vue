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
      @edit-concept-set="handleCriteriaEditConceptSet"
    />

    <ConceptSetSelectionDialog
      v-model="csPickerOpen"
      :local-concept-sets="localConceptSets"
      @local-concept-set-selected="onLocalConceptSetSelected"
      @concept-set-selected="onConceptSetSelected"
      @create-new="handleCreateNewConceptSet"
    />

    <ConceptSetEditor
      v-if="conceptSetsStore.editorOpen"
      :model-value="conceptSetsStore.editorOpen"
      :concept-set="conceptSetsStore.currentSet"
      embedded
      @update:model-value="onConceptSetEditorVisibilityChange"
      @apply="handleConceptSetApplied"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useCirceConceptSetPicker } from '@/composables/useCirceConceptSetPicker'
import { useConceptSetsStore } from '@/stores/concept-sets'
import CriteriaGroup from '@/components/circe/criteria/CriteriaGroup.vue'
import ConceptSetSelectionDialog from '@/components/cohort/ConceptSetSelectionDialog.vue'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import type { ConceptSetReference } from '@/models/cohort.types'
import type { ConceptSet, ConceptSetItem as CirceConceptSetItem, CriteriaGroup as CriteriaGroupType } from '@/models/circe-types'
import type { ConceptSetItem as AtlasConceptSetItem } from '@/models/concept-set.types'
import type { StratifyRule } from '@/models/incidence-rate.types'
import { circeConceptSetFromAtlas, convertCirceItemToAtlas } from '@/components/cohort-editor/atlas-concept-set'

const { rule, conceptSets } = defineProps<{
  rule: StratifyRule
  conceptSets: ConceptSet[]
}>()
const emit = defineEmits<{
  (e: 'update', partial: Partial<StratifyRule>): void
  (e: 'add-concept-set', cs: ConceptSet): void
}>()
const { t } = useI18n()
const conceptSetsStore = useConceptSetsStore()

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

const localConceptSets = computed<ConceptSetReference[]>(() =>
  conceptSets
    .filter((cs): cs is ConceptSet & { id: number } => typeof cs.id === 'number')
    .map(cs => ({
      id: cs.id,
      name: cs.name ?? '',
      items: (cs.expression?.items ?? []).map(convertCirceItemToAtlas),
    }))
)

// Emit mutations whenever CriteriaGroup changes the reactive object.
watch(currentGroup, (g) => {
  emit('update', { expression: { ...g } })
}, { deep: true })

const {
  pickerOpen: csPickerOpen,
  conceptSetOptions,
  onSelectConceptSet,
  onLocalConceptSetSelected,
  onConceptSetSelected: _onConceptSetSelected,
  hideSelectionDialog,
  cancelSelection,
  resolveSelection,
} =
  useCirceConceptSetPicker({
    getConceptSets: () => conceptSets,
    addConceptSet: (cs) => emit('add-concept-set', cs),
  })

async function onConceptSetSelected(cs: { id: number | string; name: string; items?: unknown[] }) {
  await _onConceptSetSelected(cs)
}

function handleCriteriaEditConceptSet(target: { targetRef: { value: number | null | undefined } } | undefined) {
  const conceptSetId = target?.targetRef.value
  if (conceptSetId === undefined || conceptSetId === null) return

  const conceptSet = localConceptSets.value.find(cs => cs.id === conceptSetId)
  if (!conceptSet) {
    throw new Error(`Incidence rate concept set ${conceptSetId} was not found in localConceptSets`)
  }

  conceptSetsStore.openEmbeddedEditor({
    id: conceptSet.id,
    name: conceptSet.name ?? '',
    items: (conceptSet.items ?? []) as AtlasConceptSetItem[],
  })
}

function handleCreateNewConceptSet() {
  hideSelectionDialog()
  conceptSetsStore.openCreateEditor()
}

function handleConceptSetApplied(set: { id?: number | string; name: string; items?: unknown[] }) {
  const conceptSet = circeConceptSetFromAtlas(
    {
      id: set.id,
      name: set.name,
      items: (set.items ?? []) as Array<AtlasConceptSetItem | CirceConceptSetItem>,
    },
    conceptSets,
  )

  if (conceptSet) {
    emit('add-concept-set', conceptSet)
  }

  conceptSetsStore.closeEditor()
  if (conceptSet?.id !== undefined && conceptSet.id !== null) {
    // Match the characterization flow: creating/editing a set from the picker
    // must feed the resolved id back into the selected criteria field.
    resolveSelection(Number(conceptSet.id))
  }
}

function onConceptSetEditorVisibilityChange(value: boolean) {
  if (!value) {
    conceptSetsStore.closeEditor()
    cancelSelection()
  }
}

</script>

<style scoped>
.rule-editor {
  padding: 8px 12px;
}
</style>
