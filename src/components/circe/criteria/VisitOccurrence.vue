<template>
  <v-card
    class="visit-occurrence-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="visit-occurrence-editor__header d-flex align-center ga-3 py-3">
      <div class="visit-occurrence-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="visit-occurrence-editor__type">
          {{ visitOccurrenceTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="visitOccurrenceConceptSetModel"
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
            class="visit-occurrence-editor__add-attribute-button"
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
import {
  AtlasButton,
  AtlasDivider,
  AtlasList,
  AtlasListItem,
  AtlasMenu,
  AtlasSpacer,
} from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { ConceptArray, Criteria, CriteriaGroup, ConceptSetSelection, DateAdjustment, DateRange, NumericRange, VisitOccurrence } from '@/models/circe-types'
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

const visitOccurrenceTitle = computed(() => 'a visit occurrence of')
const addAttributeLabel = computed(() => 'Add attribute...')
const selectConceptSetLabel = computed(() => t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: 'First Visit',
    description: 'Limit to first visit in history',
    init: () => {
      visitOccurrenceData.value.First = true
    },
    clear: () => {
      delete visitOccurrenceData.value.First
    },
    isActive: () => visitOccurrenceData.value.First === true,
  },
  {
    key: 'OccurrenceStartDate',
    label: 'Visit Start Date',
    description: 'Filter by start date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(visitOccurrenceData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(visitOccurrenceData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete visitOccurrenceData.value.OccurrenceStartDate
    },
    isActive: () => visitOccurrenceData.value.OccurrenceStartDate != null,
  },
  {
    key: 'OccurrenceEndDate',
    label: 'Visit End Date',
    description: 'Filter by end date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(visitOccurrenceData.value, 'OccurrenceEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(visitOccurrenceData.value, 'OccurrenceEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete visitOccurrenceData.value.OccurrenceEndDate
    },
    isActive: () => visitOccurrenceData.value.OccurrenceEndDate != null,
  },
  {
    key: 'VisitType',
    label: 'Visit Type',
    description: 'Filter by visit type',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(visitOccurrenceData.value, 'VisitType'),
        exclude: toRef(visitOccurrenceData.value, 'VisitTypeExclude'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      visitOccurrenceData.value.VisitType = [] as ConceptArray
      visitOccurrenceData.value.VisitTypeExclude = false
    },
    clear: () => {
      delete visitOccurrenceData.value.VisitType
      delete visitOccurrenceData.value.VisitTypeExclude
    },
    isActive: () => visitOccurrenceData.value.VisitType != null || visitOccurrenceData.value.VisitTypeExclude != null,
  },
  {
    key: 'VisitTypeCS',
    label: 'Visit Type Concept Set',
    description: 'Filter visit type by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(visitOccurrenceData.value, 'VisitTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(visitOccurrenceData.value, 'VisitTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete visitOccurrenceData.value.VisitTypeCS
    },
    isActive: () => visitOccurrenceData.value.VisitTypeCS != null,
  },
  {
    key: 'VisitSourceConcept',
    label: 'Visit Source Concept',
    description: 'Filter by visit source concept',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(visitOccurrence, 'VisitSourceConcept') as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      visitOccurrenceData.value.VisitSourceConcept = undefined
    },
    clear: () => {
      delete visitOccurrenceData.value.VisitSourceConcept
    },
    isActive: () => 'VisitSourceConcept' in visitOccurrenceData.value,
  },
  {
    key: 'VisitLength',
    label: 'Visit Length',
    description: 'Filter by visit length',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(visitOccurrenceData.value, 'VisitLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(visitOccurrenceData.value, 'VisitLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete visitOccurrenceData.value.VisitLength
    },
    isActive: () => visitOccurrenceData.value.VisitLength != null,
  },
  {
    key: 'DateAdjustment',
    label: 'Date Adjustment',
    description: 'Adjust event dates',
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(visitOccurrenceData.value, 'DateAdjustment', createDefaultDateAdjustment) as DateAdjustment
    ),
    init: () => {
      ensureObjectField(visitOccurrenceData.value, 'DateAdjustment', createDefaultDateAdjustment)
    },
    clear: () => {
      delete visitOccurrenceData.value.DateAdjustment
    },
    isActive: () => visitOccurrenceData.value.DateAdjustment != null,
  },
  {
    key: 'Age',
    label: 'Age',
    description: 'Filter by age at time of event',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(visitOccurrenceData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(visitOccurrenceData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete visitOccurrenceData.value.Age
    },
    isActive: () => visitOccurrenceData.value.Age != null,
  },
  {
    key: 'Gender',
    label: 'Gender',
    description: 'Filter by patient gender',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(visitOccurrenceData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      visitOccurrenceData.value.Gender = [] as ConceptArray
    },
    clear: () => {
      delete visitOccurrenceData.value.Gender
    },
    isActive: () => visitOccurrenceData.value.Gender != null,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(visitOccurrenceData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(visitOccurrenceData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete visitOccurrenceData.value.GenderCS
    },
    isActive: () => visitOccurrenceData.value.GenderCS != null,
  },
  {
    key: 'ProviderSpecialty',
    label: 'Provider Specialty',
    description: 'Filter by provider specialty',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(visitOccurrenceData.value, 'ProviderSpecialty'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      visitOccurrenceData.value.ProviderSpecialty = [] as ConceptArray
    },
    clear: () => {
      delete visitOccurrenceData.value.ProviderSpecialty
    },
    isActive: () => visitOccurrenceData.value.ProviderSpecialty != null,
  },
  {
    key: 'ProviderSpecialtyCS',
    label: 'Provider Specialty Concept Set',
    description: 'Filter provider specialty by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(visitOccurrenceData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(visitOccurrenceData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete visitOccurrenceData.value.ProviderSpecialtyCS
    },
    isActive: () => visitOccurrenceData.value.ProviderSpecialtyCS != null,
  },
  {
    key: 'PlaceOfService',
    label: 'Place of Service',
    description: 'Filter by place of service',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(visitOccurrenceData.value, 'PlaceOfService'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      visitOccurrenceData.value.PlaceOfService = [] as ConceptArray
    },
    clear: () => {
      delete visitOccurrenceData.value.PlaceOfService
    },
    isActive: () => visitOccurrenceData.value.PlaceOfService != null,
  },
  {
    key: 'PlaceOfServiceCS',
    label: 'Place of Service Concept Set',
    description: 'Filter place of service by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(visitOccurrenceData.value, 'PlaceOfServiceCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(visitOccurrenceData.value, 'PlaceOfServiceCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete visitOccurrenceData.value.PlaceOfServiceCS
    },
    isActive: () => visitOccurrenceData.value.PlaceOfServiceCS != null,
  },
  {
    key: 'PlaceOfServiceLocation',
    label: 'Place of Service Location',
    description: 'Filter by place of service location',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(visitOccurrence, 'PlaceOfServiceLocation') as ConceptSetSelection,
      props.conceptSets,
      'Select Source Concept',
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      visitOccurrenceData.value.PlaceOfServiceLocation = undefined
    },
    clear: () => {
      delete visitOccurrenceData.value.PlaceOfServiceLocation
    },
    isActive: () =>  'PlaceOfServiceLocation' in visitOccurrenceData.value,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Add nested criteria group',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(visitOccurrenceData.value, 'CorrelatedCriteria', () => ({})) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(visitOccurrenceData.value, 'CorrelatedCriteria', () => ({}))
    },
    clear: () => {
      delete visitOccurrenceData.value.CorrelatedCriteria
    },
    isActive: () => visitOccurrenceData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const visitOccurrenceData = computed<VisitOccurrence>(() => {
  const criteria = props.criteria as { VisitOccurrence?: VisitOccurrence }
  if (!criteria.VisitOccurrence) {
    criteria.VisitOccurrence = {} as VisitOccurrence
  }
  return criteria.VisitOccurrence
})

const visitOccurrence = () => visitOccurrenceData.value

const visitOccurrenceConceptSetModel = createConceptSetModel(visitOccurrence, 'CodesetId') as ConceptSetSelection

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.visit-occurrence-editor__type {
  font-weight: 600;
}

.visit-occurrence-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>