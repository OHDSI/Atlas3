<template>
  <v-card
    class="condition-occurrence-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="condition-occurrence-editor__header d-flex align-center ga-3 py-3">
      <div class="condition-occurrence-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="condition-occurrence-editor__type">
          {{ occurrenceTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="conditionOccurrenceConceptSetModel"
          :select-label="selectConceptSetLabel"
          @select="emit('select-concept-set', $event)"
          @edit="emit('edit-concept-set', $event)"
          @clear="emit('clear-concept-set')"
        />
      </div>

      <AtlasSpacer />

      <AtlasMenu
        :close-on-content-click="true"
        location="bottom end"
        offset="8"
      >
        <template #activator="{ props: menuProps }">
          <AtlasButton
            v-bind="menuProps"
            class="condition-occurrence-editor__add-attribute-button"
            variant="secondary"
            size="sm"
            icon="mdi-plus"
            :disabled="!canAddAttribute"
          >
            {{ addAttributeLabel }}
          </AtlasButton>
        </template>

        <AtlasList density="compact">
          <AtlasListItem
            v-for="attr in availableAttributes"
            :key="attr.key"
            :title="attr.label"
            :subtitle="attr.description"
            @click="addAttribute(attr)"
          />
        </AtlasList>
      </AtlasMenu>

      <AtlasButton
        icon="mdi-delete"
        variant="ghost"
        color="error"
        size="sm"
        @click="emit('remove')"
      />
    </v-card-text>

    <AtlasDivider />

    <v-card-text>
      <CriteriaAttributes
        :attributes="activeAttributes"
        :concept-sets="conceptSets"
        @select-concept-set="emit('select-concept-set', $event)"
        @edit-concept-set="emit('edit-concept-set', $event)"
        @clear-concept-set="emit('clear-concept-set')"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { Criteria, CriteriaGroup } from '../circe.types'
import {
  AtlasButton,
  AtlasDivider,
  AtlasList,
  AtlasListItem,
  AtlasMenu,
  AtlasSpacer,
} from '@/components/ui'
import EventConceptSet from '../input/EventConceptSet.vue'
import type { ConceptSetOption, ConceptSetSelectionTarget } from './criteria-editor.types'
import CriteriaAttributes from './CriteriaAttributes.vue'
import type { ConceptArrayBinding, CriteriaAttributeSpec } from './criteria-editor.types'
import type { ConceptSetSelection, DateAdjustment, DateRange, NumericRange, TextFilter } from '../circe.types'
import { createConceptSetComponentProps, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'

const props = defineProps<{
  criteria: Criteria
  conceptSets: ConceptSetOption[]
}>()

const emit = defineEmits<{
  remove: []
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

const { t } = useI18n()

const occurrenceTitle = computed(() =>
  t('components.conditionOccurrence.conditionOccurrenceText_1', 'a condition occurrence of').value
)

const addAttributeLabel = computed(() =>
  t('components.conditionOccurrence.addAttribute', 'Add attribute...').value
)

const selectConceptSetLabel = computed(() =>
  t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value
)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: 'First Diagnosis',
    description: 'Limit to first diagnosis in history',
    init: () => {
      conditionOccurrenceData.value.First = true
    },
    clear: () => {
      delete conditionOccurrenceData.value.First
    },
    isActive: () => conditionOccurrenceData.value.First === true,
  },
  {
    key: 'Age',
    label: 'Age',
    description: 'Filter by age at time of event',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(conditionOccurrenceData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete conditionOccurrenceData.value.Age
    },
    isActive: () => 'Age' in conditionOccurrenceData.value,
  },
  {
    key: 'Gender',
    label: 'Gender',
    description: 'Filter by patient gender',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(conditionOccurrenceData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      conditionOccurrenceData.value.Gender = []
    },
    clear: () => {
      delete conditionOccurrenceData.value.Gender
    },
    isActive: () => 'Gender' in conditionOccurrenceData.value,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(conditionOccurrenceData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete conditionOccurrenceData.value.GenderCS
    },
    isActive: () => 'GenderCS' in conditionOccurrenceData.value,
  },
  {
    key: 'ConditionStatus',
    label: 'Condition Status',
    description: 'Filter by condition status',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(conditionOccurrenceData.value, 'ConditionStatus'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      conditionOccurrenceData.value.ConditionStatus = []
    },
    clear: () => {
      delete conditionOccurrenceData.value.ConditionStatus
    },
    isActive: () => 'ConditionStatus' in conditionOccurrenceData.value,
  },
  {
    key: 'ConditionStatusCS',
    label: 'Condition Status Concept Set',
    description: 'Filter condition status by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(conditionOccurrenceData.value, 'ConditionStatusCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'ConditionStatusCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete conditionOccurrenceData.value.ConditionStatusCS
    },
    isActive: () => 'ConditionStatusCS' in conditionOccurrenceData.value,
  },
  {
    key: 'OccurrenceStartDate',
    label: 'Condition Start Date',
    description: 'Filter by start date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(conditionOccurrenceData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete conditionOccurrenceData.value.OccurrenceStartDate
    },
    isActive: () => 'OccurrenceStartDate' in conditionOccurrenceData.value,
  },
  {
    key: 'OccurrenceEndDate',
    label: 'Condition End Date',
    description: 'Filter by end date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(conditionOccurrenceData.value, 'OccurrenceEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'OccurrenceEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete conditionOccurrenceData.value.OccurrenceEndDate
    },
    isActive: () => 'OccurrenceEndDate' in conditionOccurrenceData.value,
  },
  {
    key: 'DateAdjustment',
    label: 'Date Adjustment',
    description: 'Adjust event dates',
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(conditionOccurrenceData.value, 'DateAdjustment', createDefaultDateAdjustment) as DateAdjustment
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'DateAdjustment', createDefaultDateAdjustment)
    },
    clear: () => {
      delete conditionOccurrenceData.value.DateAdjustment
    },
    isActive: () => 'DateAdjustment' in conditionOccurrenceData.value,
  },
  {
    key: 'ConditionType',
    label: 'Condition Type',
    description: 'Filter by condition type',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(conditionOccurrenceData.value, 'ConditionType'),
        exclude: toRef(conditionOccurrenceData.value, 'ConditionTypeExclude'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      conditionOccurrenceData.value.ConditionType = []
      conditionOccurrenceData.value.ConditionTypeExclude = false
    },
    clear: () => {
      delete conditionOccurrenceData.value.ConditionType
      delete conditionOccurrenceData.value.ConditionTypeExclude
    },
    isActive: () => 'ConditionType' in conditionOccurrenceData.value || 'ConditionTypeExclude' in conditionOccurrenceData.value,
  },
  {
    key: 'ConditionTypeCS',
    label: 'Condition Type Concept Set',
    description: 'Filter condition type by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(conditionOccurrenceData.value, 'ConditionTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'ConditionTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete conditionOccurrenceData.value.ConditionTypeCS
    },
    isActive: () => 'ConditionTypeCS' in conditionOccurrenceData.value,
  },
  {
    key: 'VisitType',
    label: 'Visit',
    description: 'Filter based on visit occurrence',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(conditionOccurrenceData.value, 'VisitType'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      conditionOccurrenceData.value.VisitType = []
    },
    clear: () => {
      delete conditionOccurrenceData.value.VisitType
    },
    isActive: () => 'VisitType' in conditionOccurrenceData.value,
  },
  {
    key: 'VisitTypeCS',
    label: 'Visit Type Concept Set',
    description: 'Filter visit type by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(conditionOccurrenceData.value, 'VisitTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'VisitTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete conditionOccurrenceData.value.VisitTypeCS
    },
    isActive: () => 'VisitTypeCS' in conditionOccurrenceData.value,
  },
  {
    key: 'StopReason',
    label: 'Stop Reason',
    description: 'Filter by stop reason text',
    kind: 'textFilter',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(conditionOccurrenceData.value, 'StopReason', () => ({ Value: '', Op: 'contains' })) as TextFilter
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'StopReason', () => ({ Value: '', Op: 'contains' }))
    },
    clear: () => {
      delete conditionOccurrenceData.value.StopReason
    },
    isActive: () => 'StopReason' in conditionOccurrenceData.value,
  },
  {
    key: 'ProviderSpecialty',
    label: 'Provider Specialty',
    description: 'Filter by provider specialty',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(conditionOccurrenceData.value, 'ProviderSpecialty'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      conditionOccurrenceData.value.ProviderSpecialty = []
    },
    clear: () => {
      delete conditionOccurrenceData.value.ProviderSpecialty
    },
    isActive: () => 'ProviderSpecialty' in conditionOccurrenceData.value,
  },
  {
    key: 'ProviderSpecialtyCS',
    label: 'Provider Specialty Concept Set',
    description: 'Filter provider specialty by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(conditionOccurrenceData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete conditionOccurrenceData.value.ProviderSpecialtyCS
    },
    isActive: () => 'ProviderSpecialtyCS' in conditionOccurrenceData.value,
  },
  {
    key: 'ConditionSourceConcept',
    label: 'Condition Source Concept',
    description: 'Filter by condition source concept',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      conditionSourceConceptModel,
      props.conceptSets,
      t('components.eventCard.selectSourceConcept', 'Select Source Concept').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      conditionOccurrenceData.value.ConditionSourceConcept = undefined
    },
    clear: () => {
      delete conditionOccurrenceData.value.ConditionSourceConcept
    },
    isActive: () => 'ConditionSourceConcept' in conditionOccurrenceData.value,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Add nested criteria group',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(conditionOccurrenceData.value, 'CorrelatedCriteria', () => ({})) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'CorrelatedCriteria', () => ({}))
    },
    clear: () => {
      delete conditionOccurrenceData.value.CorrelatedCriteria
    },
    isActive: () => 'CorrelatedCriteria' in conditionOccurrenceData.value,
  },
])

// Exposed so the attribute-spec/schema cross-reference test can reach the spec list.
defineExpose({ attributeSpecs })

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))

const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))

const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const conditionOccurrenceData = computed<Record<string, any>>(() => {
  const criteria = props.criteria as Record<string, any>
  if (!criteria.ConditionOccurrence) {
    criteria.ConditionOccurrence = {}
  }
  return criteria.ConditionOccurrence
})

const conditionOccurrenceConceptSetModel = {
  get CodesetId() {
    return conditionOccurrenceData.value.CodesetId
  },
  set CodesetId(value: number | undefined) {
    conditionOccurrenceData.value.CodesetId = value
  },
} as ConceptSetSelection

const conditionSourceConceptModel = {
  get CodesetId() {
    return conditionOccurrenceData.value.ConditionSourceConcept
  },
  set CodesetId(value: number | undefined) {
    conditionOccurrenceData.value.ConditionSourceConcept = value
  },
} as ConceptSetSelection

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}

</script>

<style scoped>
.condition-occurrence-editor__type {
  font-weight: 600;
}

.condition-occurrence-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>
