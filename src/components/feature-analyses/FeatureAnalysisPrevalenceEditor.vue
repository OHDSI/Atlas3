<!--
  Feature Analysis - Prevalence Criteria designer

  Prevalence rows are always CriteriaGroup-shaped (confirmed by
  SkeletonCohortCharacterization's FeatureAnalysisWithPrevalenceImpl<CriteriaGroupFeatureImpl>),
  so unlike Distribution there is no per-row criteria-type choice or aggregate -
  each row is just a name plus a full CriteriaGroup builder.
-->
<template>
  <div class="fa-prevalence-editor">
    <AtlasButton
      variant="secondary"
      size="sm"
      icon="mdi-plus"
      data-testid="fa-prevalence-add-criteria"
      @click="addCriteria"
    >
      {{ t('featureAnalyses.editor.prevalence.addCriteria', 'Add Criteria feature') }}
    </AtlasButton>

    <AtlasAlert
      v-if="design.length === 0"
      variant="tonal"
      density="compact"
      class="fa-prevalence-editor__empty"
    >
      {{ t('featureAnalyses.editor.prevalence.empty', 'No criteria features yet.') }}
    </AtlasAlert>

    <div
      v-for="(row, index) in design"
      :key="getRowKey(row)"
      class="fa-prevalence-editor__row"
      :data-testid="`fa-prevalence-row-${index}`"
    >
      <div class="fa-prevalence-editor__row-header">
        <AtlasTextField
          v-model="row.name"
          :label="t('cc.fa.criteriaName', 'Criteria name').value"
          variant="outlined"
          density="compact"
          hide-details
          class="fa-prevalence-editor__row-name"
          :data-testid="`fa-prevalence-row-${index}-name`"
        />
        <AtlasIconButton
          icon="mdi-delete-outline"
          variant="text"
          size="sm"
          :aria-label="t('common.delete', 'Delete').value"
          :data-testid="`fa-prevalence-row-${index}-delete`"
          @click="removeCriteria(index)"
        />
      </div>

      <CriteriaGroup
        :group="row.expression"
        :concept-sets="conceptSetOptions"
        @select-concept-set="onSelectConceptSet"
        @edit-concept-set="onSelectConceptSet"
      />
    </div>

    <ConceptSetSelectionDialog
      v-model="dialogOpen"
      :local-concept-sets="localConceptSets"
      @local-concept-set-selected="onLocalConceptSetSelected"
      @concept-set-selected="onConceptSetSelected"
      @edit-concept-set="handleEditConceptSet"
      @create-new="handleCreateNewConceptSet"
    />
    <!-- Concept Set Editor Side Panel (for editing/creating concept sets) -->
    <ConceptSetEditor
      v-if="conceptSetsStore.editorOpen"
      :model-value="conceptSetsStore.editorOpen"
      :concept-set="conceptSetsStore.currentSet"
      embedded
      @update:model-value="
        value => {
          if (!value) {
            conceptSetsStore.closeEditor()
            cancelSelection()
          }
        }
      "
      @apply="handleConceptSetApplied"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { AtlasAlert, AtlasButton, AtlasIconButton, AtlasTextField } from '@/components/ui'
import ConceptSetEditor from '../concepts/ConceptSetEditor.vue'
import CriteriaGroup from '@/components/circe/criteria/CriteriaGroup.vue'
import ConceptSetSelectionDialog from '@/components/cohort/ConceptSetSelectionDialog.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useI18n } from '@/composables/useI18n'
import { useCirceConceptSetPicker } from '@/composables/useCirceConceptSetPicker'
import { createObjectKeyGenerator } from '@/components/circe/criteria/criteria-editor-helper'
import type { ConceptSet, ConceptSetItem as CirceConceptSetItem, CriteriaGroup as CriteriaGroupType } from '@/models/circe-types'
import type { FeatureAnalysisAggregate, FeatureAnalysisCriteriaGroupItem } from '@/models/feature-analysis.types'
import type { ConceptSetReference } from '@/models/cohort.types'
import type { ConceptSetItem as AtlasConceptSetItem } from '@/models/concept-set.types'
import { nextConceptSetId } from '@/utils/concept-set-id'
import { convertAtlasItemToCirce } from '@/components/cohort-editor/atlas-concept-set'

const props = defineProps<{
  design: FeatureAnalysisCriteriaGroupItem[]
  conceptSets: ConceptSet[]
  aggregates: FeatureAnalysisAggregate[]
}>()

const { t } = useI18n()

const getRowKey = createObjectKeyGenerator()

const defaultAggregate = computed<FeatureAnalysisAggregate | null>(() => {
  return props.aggregates.find(aggregate => aggregate.isDefault) ?? null
})

function createEmptyCriteriaGroup(): CriteriaGroupType {
  return { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] }
}

function cloneDefaultAggregate(): FeatureAnalysisAggregate | undefined {
  const aggregate = defaultAggregate.value
  return aggregate ? { ...aggregate } : undefined
}

function addCriteria() {
  props.design.push({
    name: '',
    criteriaType: 'CriteriaGroup',
    aggregate: cloneDefaultAggregate(),
    expression: createEmptyCriteriaGroup(),
  })
}

function removeCriteria(index: number) {
  props.design.splice(index, 1)
}

const conceptSetsStore = useConceptSetsStore()

// Row expressions mutate `props.design`/`props.conceptSets` in place (same
// convention CriteriaGroup.vue itself uses for its own `group` prop), so no
// update:* emits are needed here.
const { 
  dialogOpen, 
  conceptSetOptions, 
  onSelectConceptSet, 
  onLocalConceptSetSelected, 
  onConceptSetSelected, 
  hideSelectionDialog,
  resolveSelection,
  cancelSelection,
} = useCirceConceptSetPicker({
    getConceptSets: () => props.conceptSets,
    addConceptSet: cs => props.conceptSets.push(cs),
  })

const localConceptSets = computed<ConceptSetReference[]>(() =>
  props.conceptSets
    .filter((cs): cs is ConceptSet & { id: number } => typeof cs.id === 'number')
    .map(cs => ({ id: cs.id, name: cs.name ?? '', items: cs.expression?.items ?? [] }))
)

watch(
  defaultAggregate,
  aggregate => {
    if (!aggregate) return
    for (const row of props.design) {
      if (!row.aggregate) {
        row.aggregate = { ...aggregate }
      }
    }
  },
  { immediate: true }
)

/**
 * Called when user clicks "Edit" on a concept set (from chip or dialog)
 */
async function handleEditConceptSet(conceptSet: {
  id: number | string
  name: string
  items?: unknown[]
}) {
  hideSelectionDialog()
  conceptSetsStore.openEmbeddedEditor({
    id: conceptSet.id,
    name: conceptSet.name,
    items: (conceptSet.items || []).map(item => convertCirceItemToAtlas(item as CirceConceptSetItem)),
  })
}

/**
 * Called when user clicks "Create New" in the dialog
 */
function handleCreateNewConceptSet() {
  hideSelectionDialog()
  conceptSetsStore.openCreateEditor()
}

/**
 * Called when the embedded editor applies its changes. Upserts the concept set
 * into expression.ConceptSets and resolves the active selection request when
 * the editor was opened from a concept-set selection flow.
 */
function handleConceptSetApplied(set: { id?: number | string; name: string; items?: unknown[] }) {
  const items = JSON.parse(JSON.stringify(set.items ?? [])) as CirceConceptSetItem[]

  const finalId = set.id === undefined || set.id === null
    ? nextConceptSetId((props.conceptSets ?? []).filter(cs => cs.id !== undefined) as Pick<ConceptSetReference, 'id'>[])
    : (set.id as number)

  // Upserts unconditionally, including on a pure rename with no active
  // selection context. That is what develop's #212 fix restored on the legacy
  // model by calling upsertConceptSetInCohort outside the context check; here
  // the expression's ConceptSets array is the single canonical list, so
  // replacing the entry in place covers the same case.
  const existingIdx = props.conceptSets.findIndex(cs => cs.id === finalId)
  const circeItems = items.map(convertAtlasItemToCirce)
  if (existingIdx !== -1) {
    props.conceptSets[existingIdx] = { id: finalId, name: set.name, expression: { items: circeItems } }
  } else {
    props.conceptSets.push({ id: finalId, name: set.name, expression: { items: circeItems } })
  }
  resolveSelection(finalId)
}

function convertCirceItemToAtlas(item: CirceConceptSetItem): AtlasConceptSetItem {
  const concept = item.concept
  return {
    conceptId: concept?.CONCEPT_ID ?? 0,
    conceptName: concept?.CONCEPT_NAME ?? '',
    conceptCode: concept?.CONCEPT_CODE ?? '',
    domainId: concept?.DOMAIN_ID ?? '',
    vocabularyId: concept?.VOCABULARY_ID ?? '',
    conceptClassId: concept?.CONCEPT_CLASS_ID ?? '',
    standardConcept: concept?.STANDARD_CONCEPT ?? null,
    invalidReason: concept?.INVALID_REASON ?? null,
    isExcluded: item.isExcluded ?? false,
    includeDescendants: item.includeDescendants ?? false,
    includeMapped: item.includeMapped ?? false,
  }
}

</script>

<style scoped>
.fa-prevalence-editor__empty {
  margin-top: 12px;
}

.fa-prevalence-editor__row {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgb(var(--v-theme-outline-variant, 224, 224, 224));
}

.fa-prevalence-editor__row-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.fa-prevalence-editor__row-name {
  flex: 1 1 auto;
}
</style>
