<template>
  <v-card
    class="specimen-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="specimen-editor__header d-flex align-center ga-3 py-3">
      <div class="specimen-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="specimen-editor__type">
          {{ specimenTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="specimenConceptSetModel"
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
            class="specimen-editor__add-attribute-button"
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
        variant="text"
        color="error"
        size="small"
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
import {
  AtlasButton,
  AtlasDivider,
  AtlasList,
  AtlasListItem,
  AtlasMenu,
  AtlasSpacer,
} from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { Criteria, CriteriaGroup, ConceptSetSelection, DateAdjustment, DateRange, NumericRange, TextFilter } from '../circe.types'
import type { ConceptArrayBinding, ConceptSetOption, ConceptSetSelectionTarget, CriteriaAttributeSpec } from './criteria-editor.types'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createConceptSetModel, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
import EventConceptSet from '../input/EventConceptSet.vue'

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

const specimenTitle = computed(() => 'a specimen of')
const addAttributeLabel = computed(() => 'Add attribute...')
const selectConceptSetLabel = computed(() => t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: 'First Specimen',
    description: 'Limit to first specimen in history',
    init: () => {
      specimenData.value.First = true
    },
    clear: () => {
      delete specimenData.value.First
    },
    isActive: () => specimenData.value.First === true,
  },
  {
    key: 'OccurrenceStartDate',
    label: 'Specimen Date',
    description: 'Filter by specimen date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(specimenData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete specimenData.value.OccurrenceStartDate
    },
    isActive: () => specimenData.value.OccurrenceStartDate != null,
  },
  {
    key: 'SpecimenType',
    label: 'Specimen Type',
    description: 'Filter by specimen type',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(specimenData.value, 'SpecimenType'),
        exclude: toRef(specimenData.value, 'SpecimenTypeExclude'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      specimenData.value.SpecimenType = []
      specimenData.value.SpecimenTypeExclude = false
    },
    clear: () => {
      delete specimenData.value.SpecimenType
      delete specimenData.value.SpecimenTypeExclude
    },
    isActive: () => specimenData.value.SpecimenType != null || specimenData.value.SpecimenTypeExclude != null,
  },
  {
    key: 'SpecimenTypeCS',
    label: 'Specimen Type Concept Set',
    description: 'Filter specimen type by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(specimenData.value, 'SpecimenTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'SpecimenTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete specimenData.value.SpecimenTypeCS
    },
    isActive: () => specimenData.value.SpecimenTypeCS != null,
  },
  {
    key: 'Quantity',
    label: 'Quantity',
    description: 'Filter by quantity',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(specimenData.value, 'Quantity', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'Quantity', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete specimenData.value.Quantity
    },
    isActive: () => specimenData.value.Quantity != null,
  },
  {
    key: 'Unit',
    label: 'Unit',
    description: 'Filter by unit',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(specimenData.value, 'Unit'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      specimenData.value.Unit = []
    },
    clear: () => {
      delete specimenData.value.Unit
    },
    isActive: () => specimenData.value.Unit != null,
  },
  {
    key: 'UnitCS',
    label: 'Unit Concept Set',
    description: 'Filter unit by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(specimenData.value, 'UnitCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'UnitCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete specimenData.value.UnitCS
    },
    isActive: () => specimenData.value.UnitCS != null,
  },
  {
    key: 'AnatomicSite',
    label: 'Anatomic Site',
    description: 'Filter by anatomic site',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(specimenData.value, 'AnatomicSite'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      specimenData.value.AnatomicSite = []
    },
    clear: () => {
      delete specimenData.value.AnatomicSite
    },
    isActive: () => specimenData.value.AnatomicSite != null,
  },
  {
    key: 'AnatomicSiteCS',
    label: 'Anatomic Site Concept Set',
    description: 'Filter anatomic site by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(specimenData.value, 'AnatomicSiteCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'AnatomicSiteCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete specimenData.value.AnatomicSiteCS
    },
    isActive: () => specimenData.value.AnatomicSiteCS != null,
  },
  {
    key: 'DiseaseStatus',
    label: 'Disease Status',
    description: 'Filter by disease status',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(specimenData.value, 'DiseaseStatus'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      specimenData.value.DiseaseStatus = []
    },
    clear: () => {
      delete specimenData.value.DiseaseStatus
    },
    isActive: () => specimenData.value.DiseaseStatus != null,
  },
  {
    key: 'DiseaseStatusCS',
    label: 'Disease Status Concept Set',
    description: 'Filter disease status by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(specimenData.value, 'DiseaseStatusCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'DiseaseStatusCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete specimenData.value.DiseaseStatusCS
    },
    isActive: () => specimenData.value.DiseaseStatusCS != null,
  },
  {
    key: 'SourceId',
    label: 'Source ID',
    description: 'Filter by specimen source ID',
    kind: 'textFilter',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(specimenData.value, 'SourceId', () => ({ Value: '', Op: 'contains' })) as TextFilter
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'SourceId', () => ({ Value: '', Op: 'contains' }))
    },
    clear: () => {
      delete specimenData.value.SourceId
    },
    isActive: () => specimenData.value.SourceId != null,
  },
  {
    key: 'DateAdjustment',
    label: 'Date Adjustment',
    description: 'Adjust event dates',
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(specimenData.value, 'DateAdjustment', createDefaultDateAdjustment) as DateAdjustment
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'DateAdjustment', createDefaultDateAdjustment)
    },
    clear: () => {
      delete specimenData.value.DateAdjustment
    },
    isActive: () => specimenData.value.DateAdjustment != null,
  },
  {
    key: 'SpecimenSourceConcept',
    label: 'Specimen Source Concept',
    description: 'Filter by specimen source concept',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(specimen, 'SpecimenSourceConcept') as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      specimenData.value.SpecimenSourceConcept = undefined
    },
    clear: () => {
      delete specimenData.value.SpecimenSourceConcept
    },
    isActive: () => specimenData.value.SpecimenSourceConcept != null,
  },
  {
    key: 'Age',
    label: 'Age',
    description: 'Filter by age at time of event',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(specimenData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete specimenData.value.Age
    },
    isActive: () => specimenData.value.Age != null,
  },
  {
    key: 'Gender',
    label: 'Gender',
    description: 'Filter by patient gender',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(specimenData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      specimenData.value.Gender = []
    },
    clear: () => {
      delete specimenData.value.Gender
    },
    isActive: () => specimenData.value.Gender != null,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(specimenData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete specimenData.value.GenderCS
    },
    isActive: () => specimenData.value.GenderCS != null,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Add nested criteria group',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(specimenData.value, 'CorrelatedCriteria', () => ({})) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(specimenData.value, 'CorrelatedCriteria', () => ({}))
    },
    clear: () => {
      delete specimenData.value.CorrelatedCriteria
    },
    isActive: () => specimenData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const specimenData = computed<Record<string, any>>(() => {
  const criteria = props.criteria as Record<string, any>
  if (!criteria.Specimen) {
    criteria.Specimen = {}
  }
  return criteria.Specimen
})

const specimen = () => specimenData.value

const specimenConceptSetModel = createConceptSetModel(specimen, 'CodesetId') as ConceptSetSelection

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.specimen-editor__type {
  font-weight: 600;
}

.specimen-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>