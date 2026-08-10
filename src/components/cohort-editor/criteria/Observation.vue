<template>
  <v-card
    class="observation-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="observation-editor__header d-flex align-center ga-3 py-3">
      <div class="observation-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="observation-editor__type">
          {{ observationTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="observationConceptSetModel"
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
            class="observation-editor__add-attribute-button"
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
import type { Criteria, CriteriaGroup, ConceptSetSelection, DateAdjustment, DateRange, NumericRange, TextFilter } from '../circe.types'
import EventConceptSet from '../input/EventConceptSet.vue'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
import type { ConceptArrayBinding, ConceptSetOption, ConceptSetSelectionTarget, CriteriaAttributeSpec } from './criteria-editor.types'

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

const observationTitle = computed(() => 'an observation of')
const addAttributeLabel = computed(() => 'Add attribute...')
const selectConceptSetLabel = computed(() => 'Select Concept Set')

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: 'First Observation',
    description: 'Limit to first observation in history',
    init: () => {
      observationData.value.First = true
    },
    clear: () => {
      delete observationData.value.First
    },
    isActive: () => observationData.value.First === true,
  },
  {
    key: 'OccurrenceStartDate',
    label: 'Observation Date',
    description: 'Filter by observation date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(observationData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete observationData.value.OccurrenceStartDate
    },
    isActive: () => 'OccurrenceStartDate' in observationData.value,
  },
  {
    key: 'ObservationType',
    label: 'Observation Type',
    description: 'Filter by observation type',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationData.value, 'ObservationType'),
        exclude: toRef(observationData.value, 'ObservationTypeExclude'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      observationData.value.ObservationType = []
      observationData.value.ObservationTypeExclude = false
    },
    clear: () => {
      delete observationData.value.ObservationType
      delete observationData.value.ObservationTypeExclude
    },
    isActive: () => 'ObservationType' in observationData.value || 'ObservationTypeExclude' in observationData.value,
  },
  {
    key: 'ObservationTypeCS',
    label: 'Observation Type Concept Set',
    description: 'Filter observation type by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(observationData.value, 'ObservationTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(observationData.value, 'ObservationTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete observationData.value.ObservationTypeCS
    },
    isActive: () => 'ObservationTypeCS' in observationData.value,
  },
  {
    key: 'ValueAsNumber',
    label: 'Value as Number',
    description: 'Filter by numeric value',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationData.value, 'ValueAsNumber', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(observationData.value, 'ValueAsNumber', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete observationData.value.ValueAsNumber
    },
    isActive: () => 'ValueAsNumber' in observationData.value,
  },
  {
    key: 'DateAdjustment',
    label: 'Date Adjustment',
    description: 'Adjust event dates',
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationData.value, 'DateAdjustment', createDefaultDateAdjustment) as DateAdjustment
    ),
    init: () => {
      ensureObjectField(observationData.value, 'DateAdjustment', createDefaultDateAdjustment)
    },
    clear: () => {
      delete observationData.value.DateAdjustment
    },
    isActive: () => 'DateAdjustment' in observationData.value,
  },
  {
    key: 'ValueAsString',
    label: 'Value as String',
    description: 'Filter by text value',
    kind: 'textFilter',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationData.value, 'ValueAsString', () => ({ Value: '', Op: 'contains' })) as TextFilter
    ),
    init: () => {
      ensureObjectField(observationData.value, 'ValueAsString', () => ({ Value: '', Op: 'contains' }))
    },
    clear: () => {
      delete observationData.value.ValueAsString
    },
    isActive: () => 'ValueAsString' in observationData.value,
  },
  {
    key: 'ValueAsConcept',
    label: 'Value as Concept',
    description: 'Filter by concept value',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationData.value, 'ValueAsConcept'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      observationData.value.ValueAsConcept = []
    },
    clear: () => {
      delete observationData.value.ValueAsConcept
    },
    isActive: () => 'ValueAsConcept' in observationData.value,
  },
  {
    key: 'ValueAsConceptCS',
    label: 'Value as Concept Set',
    description: 'Filter concept value by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(observationData.value, 'ValueAsConceptCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(observationData.value, 'ValueAsConceptCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete observationData.value.ValueAsConceptCS
    },
    isActive: () => 'ValueAsConceptCS' in observationData.value,
  },
  {
    key: 'Qualifier',
    label: 'Qualifier',
    description: 'Filter by qualifier',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationData.value, 'Qualifier'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      observationData.value.Qualifier = []
    },
    clear: () => {
      delete observationData.value.Qualifier
    },
    isActive: () => 'Qualifier' in observationData.value,
  },
  {
    key: 'QualifierCS',
    label: 'Qualifier Concept Set',
    description: 'Filter qualifier by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(observationData.value, 'QualifierCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(observationData.value, 'QualifierCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete observationData.value.QualifierCS
    },
    isActive: () => 'QualifierCS' in observationData.value,
  },
  {
    key: 'Unit',
    label: 'Unit',
    description: 'Filter by unit',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationData.value, 'Unit'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      observationData.value.Unit = []
    },
    clear: () => {
      delete observationData.value.Unit
    },
    isActive: () => 'Unit' in observationData.value,
  },
  {
    key: 'UnitCS',
    label: 'Unit Concept Set',
    description: 'Filter unit by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(observationData.value, 'UnitCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(observationData.value, 'UnitCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete observationData.value.UnitCS
    },
    isActive: () => 'UnitCS' in observationData.value,
  },
  {
    key: 'ObservationSourceConcept',
    label: 'Observation Source Concept',
    description: 'Filter by observation source concept',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      observationSourceConceptModel,
      props.conceptSets,
      'Select Source Concept',
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      observationData.value.ObservationSourceConcept = undefined
    },
    clear: () => {
      delete observationData.value.ObservationSourceConcept
    },
    isActive: () => 'ObservationSourceConcept' in observationData.value,
  },
  {
    key: 'Age',
    label: 'Age',
    description: 'Filter by age at time of event',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(observationData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete observationData.value.Age
    },
    isActive: () => 'Age' in observationData.value,
  },
  {
    key: 'Gender',
    label: 'Gender',
    description: 'Filter by patient gender',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      observationData.value.Gender = []
    },
    clear: () => {
      delete observationData.value.Gender
    },
    isActive: () => 'Gender' in observationData.value,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(observationData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(observationData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete observationData.value.GenderCS
    },
    isActive: () => 'GenderCS' in observationData.value,
  },
  {
    key: 'ProviderSpecialty',
    label: 'Provider Specialty',
    description: 'Filter by provider specialty',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationData.value, 'ProviderSpecialty'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      observationData.value.ProviderSpecialty = []
    },
    clear: () => {
      delete observationData.value.ProviderSpecialty
    },
    isActive: () => 'ProviderSpecialty' in observationData.value,
  },
  {
    key: 'ProviderSpecialtyCS',
    label: 'Provider Specialty Concept Set',
    description: 'Filter provider specialty by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(observationData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(observationData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete observationData.value.ProviderSpecialtyCS
    },
    isActive: () => 'ProviderSpecialtyCS' in observationData.value,
  },
  {
    key: 'VisitType',
    label: 'Visit Type',
    description: 'Filter by visit type',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationData.value, 'VisitType'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      observationData.value.VisitType = []
    },
    clear: () => {
      delete observationData.value.VisitType
    },
    isActive: () => 'VisitType' in observationData.value,
  },
  {
    key: 'VisitTypeCS',
    label: 'Visit Type Concept Set',
    description: 'Filter visit type by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(observationData.value, 'VisitTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(observationData.value, 'VisitTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete observationData.value.VisitTypeCS
    },
    isActive: () => 'VisitTypeCS' in observationData.value,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Add nested criteria group',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(observationData.value, 'CorrelatedCriteria', () => ({})) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(observationData.value, 'CorrelatedCriteria', () => ({}))
    },
    clear: () => {
      delete observationData.value.CorrelatedCriteria
    },
    isActive: () => 'CorrelatedCriteria' in observationData.value,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const observationData = computed<Record<string, any>>(() => {
  const criteria = props.criteria as Record<string, any>
  if (!criteria.Observation) {
    criteria.Observation = {}
  }
  return criteria.Observation
})

const observationConceptSetModel = {
  get CodesetId() {
    return observationData.value.CodesetId
  },
  set CodesetId(value: number | undefined) {
    observationData.value.CodesetId = value
  },
} as ConceptSetSelection

const observationSourceConceptModel = {
  get CodesetId() {
    return observationData.value.ObservationSourceConcept
  },
  set CodesetId(value: number | undefined) {
    observationData.value.ObservationSourceConcept = value
  },
} as ConceptSetSelection

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.observation-editor__type {
  font-weight: 600;
}

.observation-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>