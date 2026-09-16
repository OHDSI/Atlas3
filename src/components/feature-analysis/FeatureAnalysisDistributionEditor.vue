<template>
  <div class="fa-distribution-editor">
    <AtlasMenu
      v-model="showAddMenu"
      :close-on-content-click="true"
      location="bottom start"
    >
      <template #activator="{ props: menuProps }">
        <AtlasButton
          v-bind="menuProps"
          variant="secondary"
          size="sm"
          icon="mdi-plus"
          data-testid="fa-distribution-add-criteria"
        >
          {{ addCriteriaLabel }}
        </AtlasButton>
      </template>

      <AtlasList density="compact">
        <AtlasListItem
          v-for="option in criteriaOptions"
          :key="option.value"
          :title="option.title"
          :subtitle="option.subtitle"
          @click="addWindowedCriteria(option.value)"
        />
        <AtlasListItem
          :title="demographicCriteriaLabel"
          :subtitle="demographicCriteriaSubtitle"
          @click="addDemographicCriteria"
        />
      </AtlasList>
    </AtlasMenu>

    <AtlasAlert
      v-if="design.length === 0"
      variant="tonal"
      density="compact"
      class="fa-distribution-editor__empty"
    >
      {{ emptyLabel }}
    </AtlasAlert>

    <div
      v-for="(row, index) in design"
      :key="getRowKey(row)"
      class="fa-distribution-editor__row"
      :data-testid="`fa-distribution-row-${index}`"
    >
      <div class="fa-distribution-editor__row-header">
        <AtlasTextField
          v-model="row.name"
          :label="criteriaNameLabel"
          variant="outlined"
          density="compact"
          hide-details
          class="fa-distribution-editor__row-name"
          :data-testid="`fa-distribution-row-${index}-name`"
        />

        <AggrecateSelect
          :criteria="row"
          :aggregates="aggregates"
          :label="aggregateLabel"
        />

        <AtlasIconButton
          icon="mdi-delete-outline"
          variant="text"
          size="sm"
          :aria-label="deleteLabel"
          :data-testid="`fa-distribution-row-${index}-delete`"
          @click="removeCriteria(index)"
        />
      </div>

      <DemographicCriteria
        v-if="row.criteriaType === 'DemographicCriteria'"
        compact
        :criteria="row.expression"
        :concept-sets="conceptSetOptions"
        @select-concept-set="onSelectConceptSet"
        @edit-concept-set="onSelectConceptSet"
        @clear-concept-set="cancelSelection"
      />

      <WindowCriteria
        v-else
        :criteria="row.expression"
        :concept-sets="conceptSetOptions"
        @select-concept-set="onSelectConceptSet"
        @edit-concept-set="onSelectConceptSet"
        @clear-concept-set="cancelSelection"
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
import { computed, ref, watch } from 'vue'
import { AtlasAlert, AtlasButton, AtlasIconButton, AtlasList, AtlasListItem, AtlasMenu, AtlasTextField } from '@/components/ui'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import DemographicCriteria from '@/components/circe/criteria/DemographicCriteria.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useI18n } from '@/composables/useI18n'
import { useCirceConceptSetPicker } from '@/composables/useCirceConceptSetPicker'
import { createObjectKeyGenerator } from '@/components/circe/criteria/criteria-editor-helper'
import { createDefaultWindow } from '@/components/circe/criteria/window-utils'
import type { ConceptSetItem as AtlasConceptSetItem } from '@/models/concept-set.types'
import type { ConceptSet as CirceConceptSet, ConceptSetItem as CirceConceptSetItem } from '@/models/circe-types'
import type { ConceptSetReference } from '@/models/cohort.types'
import type { EditableCriteriaKey } from '@/components/circe/criteria/criteria-registry'
import type { FeatureAnalysisAggregate, FeatureAnalysisDemographicCriteriaItem, FeatureAnalysisDistributionItem, FeatureAnalysisWindowedCriteriaItem } from '@/models/feature-analysis.types'
import { CRITERIA_TYPE_BY_KEY, EDITABLE_CRITERIA_TYPES } from '@/components/circe/criteria/criteria-registry'
import { nextConceptSetId } from '@/utils/concept-set-id'
import { convertAtlasItemToCirce } from '@/components/cohort-editor/atlas-concept-set'
import AggrecateSelect from '@/components/circe/criteria/AggrecateSelect.vue'
import WindowCriteria from '@/components/circe/criteria/WindowCriteria.vue'

const props = defineProps<{
  design: FeatureAnalysisDistributionItem[]
  conceptSets: CirceConceptSet[]
  aggregates: FeatureAnalysisAggregate[]
}>()

const { t } = useI18n()
const getRowKey = createObjectKeyGenerator()
const conceptSetsStore = useConceptSetsStore()
const showAddMenu = ref(false)

const defaultAggregate = computed<FeatureAnalysisAggregate | null>(() => props.aggregates.find(aggregate => aggregate.isDefault) ?? null)
const addCriteriaLabel = computed(() => t('featureAnalyses.editor.distribution.addCriteria', 'Add Criteria feature').value)
const emptyLabel = computed(() => t('featureAnalyses.editor.distribution.empty', 'No criteria features yet.').value)
const criteriaNameLabel = computed(() => t('cc.fa.criteriaName', 'Criteria name').value)
const aggregateLabel = computed(() => t('cc.fa.aggregate', 'Aggregate').value)
const deleteLabel = computed(() => t('common.delete', 'Delete').value)
const demographicCriteriaLabel = computed(() => t('components.demographicCriteria.name', 'Demographic Criteria').value)
const demographicCriteriaSubtitle = computed(() => t('featureAnalyses.editor.distribution.demographicSubtitle', 'Demographic criteria are not windowed').value)

const criteriaOptions = EDITABLE_CRITERIA_TYPES.map(type => ({
  value: type.key as EditableCriteriaKey,
  title: t(type.i18nKey, type.label).value,
  subtitle: type.domains.length > 0 ? type.domains.join(', ') : t('common.allDomains', 'All domains').value,
}))

const conceptSetsStorePicker = useCirceConceptSetPicker({
  getConceptSets: () => props.conceptSets,
  addConceptSet: conceptSet => props.conceptSets.push(conceptSet),
})

const {
  dialogOpen,
  conceptSetOptions,
  onSelectConceptSet,
  onLocalConceptSetSelected,
  onConceptSetSelected,
  hideSelectionDialog,
  resolveSelection,
  cancelSelection,
} = conceptSetsStorePicker

const localConceptSets = computed<ConceptSetReference[]>(() =>
  props.conceptSets
    .filter((conceptSet): conceptSet is CirceConceptSet & { id: number } => typeof conceptSet.id === 'number')
    .map(conceptSet => ({ id: conceptSet.id, name: conceptSet.name ?? '', items: conceptSet.expression?.items ?? [] }))
)

function cloneDefaultAggregate(): FeatureAnalysisAggregate | undefined {
  return defaultAggregate.value ? { ...defaultAggregate.value } : undefined
}

function addWindowedCriteria(criteriaKey: EditableCriteriaKey) {
  showAddMenu.value = false
  props.design.push({
    name: '',
    criteriaType: 'WindowedCriteria',
    aggregate: cloneDefaultAggregate(),
    expression: {
      Criteria: CRITERIA_TYPE_BY_KEY[criteriaKey].create() as FeatureAnalysisWindowedCriteriaItem['expression']['Criteria'],
      StartWindow: createDefaultWindow(),
      RestrictVisit: false,
      IgnoreObservationPeriod: true,
    },
  })
}

function addDemographicCriteria() {
  showAddMenu.value = false
  props.design.push({
    name: '',
    criteriaType: 'DemographicCriteria',
    aggregate: undefined,
    expression: {},
  } satisfies FeatureAnalysisDemographicCriteriaItem)
}

function removeCriteria(index: number) {
  props.design.splice(index, 1)
}

watch(
  defaultAggregate,
  aggregate => {
    if (!aggregate) return
    for (const row of props.design) {
      if (!row.aggregate && row.criteriaType !== 'DemographicCriteria') {
        row.aggregate = { ...aggregate }
      }
    }
  },
  { immediate: true }
)

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

function handleCreateNewConceptSet() {
  hideSelectionDialog()
  conceptSetsStore.openCreateEditor()
}

function handleConceptSetApplied(set: { id?: number | string; name: string; items?: unknown[] }) {
  const items = JSON.parse(JSON.stringify(set.items ?? [])) as CirceConceptSetItem[]

  const finalId = set.id === undefined || set.id === null
    ? nextConceptSetId((props.conceptSets ?? []).filter(conceptSet => conceptSet.id !== undefined) as Pick<ConceptSetReference, 'id'>[])
    : (set.id as number)

  const existingIdx = props.conceptSets.findIndex(conceptSet => conceptSet.id === finalId)
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
.fa-distribution-editor__empty {
  margin-top: 12px;
}

.fa-distribution-editor__row {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgb(var(--v-theme-outline-variant, 224, 224, 224));
}

.fa-distribution-editor__row-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.fa-distribution-editor__row-name {
  flex: 1 1 auto;
}
</style>
