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
import type { Criteria, ConceptSetSelection, DateRange, NumericRange, TextFilter } from '../circe.types'
import type { ConceptArrayBinding, ConceptSetOption, ConceptSetSelectionTarget, CriteriaAttributeSpec } from './criteria-editor.types'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createConceptSetModel, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
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
    isActive: () => 'OccurrenceStartDate' in specimenData.value,
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
    isActive: () => 'SpecimenType' in specimenData.value || 'SpecimenTypeExclude' in specimenData.value,
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
    isActive: () => 'SpecimenTypeCS' in specimenData.value,
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
    isActive: () => 'Quantity' in specimenData.value,
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
    isActive: () => 'Unit' in specimenData.value,
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
    isActive: () => 'UnitCS' in specimenData.value,
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
    isActive: () => 'AnatomicSite' in specimenData.value,
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
    isActive: () => 'AnatomicSiteCS' in specimenData.value,
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
    isActive: () => 'DiseaseStatus' in specimenData.value,
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
    isActive: () => 'DiseaseStatusCS' in specimenData.value,
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
    isActive: () => 'SourceId' in specimenData.value,
  },
  {
    key: 'SpecimenSourceConcept',
    label: 'Specimen Source Concept',
    description: 'Filter by specimen source concept',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(specimenData.value, 'SpecimenSourceConcept') as ConceptSetSelection,
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
    isActive: () => 'SpecimenSourceConcept' in specimenData.value,
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
    isActive: () => 'Age' in specimenData.value,
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
    isActive: () => 'Gender' in specimenData.value,
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
    isActive: () => 'GenderCS' in specimenData.value,
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

const specimenConceptSetModel = {
  get CodesetId() {
    return specimenData.value.CodesetId
  },
  set CodesetId(value: number | undefined) {
    specimenData.value.CodesetId = value
  },
} as ConceptSetSelection

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