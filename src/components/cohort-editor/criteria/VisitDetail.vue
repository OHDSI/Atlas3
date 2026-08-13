<template>
  <v-card
    class="visit-detail-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="visit-detail-editor__header d-flex align-center ga-3 py-3">
      <div class="visit-detail-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="visit-detail-editor__type">
          {{ visitDetailTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="visitDetailConceptSetModel"
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
            class="visit-detail-editor__add-attribute-button"
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
import { computed } from 'vue'
import {
  AtlasButton,
  AtlasDivider,
  AtlasList,
  AtlasListItem,
  AtlasMenu,
  AtlasSpacer,
} from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { Criteria, CriteriaGroup, ConceptSetSelection, DateAdjustment, DateRange, NumericRange } from '../circe.types'
import type { ConceptSetOption, ConceptSetSelectionTarget, CriteriaAttributeSpec } from './criteria-editor.types'
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

const visitDetailTitle = computed(() => 'a visit detail of')
const addAttributeLabel = computed(() => 'Add attribute...')
const selectConceptSetLabel = computed(() => t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: 'First Visit Detail',
    description: 'Limit to first visit detail in history',
    init: () => {
      visitDetailData.value.First = true
    },
    clear: () => {
      delete visitDetailData.value.First
    },
    isActive: () => visitDetailData.value.First === true,
  },
  {
    key: 'VisitDetailStartDate',
    label: 'Visit Detail Start Date',
    description: 'Filter by start date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(visitDetailData.value, 'VisitDetailStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(visitDetailData.value, 'VisitDetailStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete visitDetailData.value.VisitDetailStartDate
    },
    isActive: () => visitDetailData.value.VisitDetailStartDate != null,
  },
  {
    key: 'VisitDetailEndDate',
    label: 'Visit Detail End Date',
    description: 'Filter by end date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(visitDetailData.value, 'VisitDetailEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(visitDetailData.value, 'VisitDetailEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete visitDetailData.value.VisitDetailEndDate
    },
    isActive: () => visitDetailData.value.VisitDetailEndDate != null,
  },
  {
    key: 'VisitDetailTypeCS',
    label: 'Visit Detail Type Concept Set',
    description: 'Filter visit detail type by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(visitDetailData.value, 'VisitDetailTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(visitDetailData.value, 'VisitDetailTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete visitDetailData.value.VisitDetailTypeCS
    },
    isActive: () => visitDetailData.value.VisitDetailTypeCS != null,
  },
  {
    key: 'VisitDetailSourceConcept',
    label: 'Visit Detail Source Concept',
    description: 'Filter by visit detail source concept',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(visitDetail, 'VisitDetailSourceConcept') as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      visitDetailData.value.VisitDetailSourceConcept = undefined
    },
    clear: () => {
      delete visitDetailData.value.VisitDetailSourceConcept
    },
    isActive: () => visitDetailData.value.VisitDetailSourceConcept != null,
  },
  {
    key: 'VisitDetailLength',
    label: 'Visit Detail Length',
    description: 'Filter by visit detail length',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(visitDetailData.value, 'VisitDetailLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(visitDetailData.value, 'VisitDetailLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete visitDetailData.value.VisitDetailLength
    },
    isActive: () => visitDetailData.value.VisitDetailLength != null,
  },
  {
    key: 'DateAdjustment',
    label: 'Date Adjustment',
    description: 'Adjust event dates',
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(visitDetailData.value, 'DateAdjustment', createDefaultDateAdjustment) as DateAdjustment
    ),
    init: () => {
      ensureObjectField(visitDetailData.value, 'DateAdjustment', createDefaultDateAdjustment)
    },
    clear: () => {
      delete visitDetailData.value.DateAdjustment
    },
    isActive: () => visitDetailData.value.DateAdjustment != null,
  },
  {
    key: 'Age',
    label: 'Age',
    description: 'Filter by age at time of event',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(visitDetailData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(visitDetailData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete visitDetailData.value.Age
    },
    isActive: () => visitDetailData.value.Age != null,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(visitDetailData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(visitDetailData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete visitDetailData.value.GenderCS
    },
    isActive: () => visitDetailData.value.GenderCS != null,
  },
  {
    key: 'ProviderSpecialtyCS',
    label: 'Provider Specialty Concept Set',
    description: 'Filter provider specialty by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(visitDetailData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(visitDetailData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete visitDetailData.value.ProviderSpecialtyCS
    },
    isActive: () => visitDetailData.value.ProviderSpecialtyCS != null,
  },
  {
    key: 'PlaceOfServiceCS',
    label: 'Place of Service Concept Set',
    description: 'Filter place of service by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(visitDetailData.value, 'PlaceOfServiceCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(visitDetailData.value, 'PlaceOfServiceCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete visitDetailData.value.PlaceOfServiceCS
    },
    isActive: () => visitDetailData.value.PlaceOfServiceCS != null,
  },
  {
    key: 'PlaceOfServiceLocation',
    label: 'Place of Service Location',
    description: 'Filter by place of service location',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(visitDetail, 'PlaceOfServiceLocation') as ConceptSetSelection,
      props.conceptSets,
      'Select Source Concept',
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      visitDetailData.value.PlaceOfServiceLocation = undefined
    },
    clear: () => {
      delete visitDetailData.value.PlaceOfServiceLocation
    },
    isActive: () => visitDetailData.value.PlaceOfServiceLocation != null,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Add nested criteria group',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(visitDetailData.value, 'CorrelatedCriteria', () => ({})) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(visitDetailData.value, 'CorrelatedCriteria', () => ({}))
    },
    clear: () => {
      delete visitDetailData.value.CorrelatedCriteria
    },
    isActive: () => visitDetailData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const visitDetailData = computed<Record<string, any>>(() => {
  const criteria = props.criteria as Record<string, any>
  if (!criteria.VisitDetail) {
    criteria.VisitDetail = {}
  }
  return criteria.VisitDetail
})

const visitDetail = () => visitDetailData.value

const visitDetailConceptSetModel = createConceptSetModel(visitDetail, 'CodesetId') as ConceptSetSelection

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.visit-detail-editor__type {
  font-weight: 600;
}

.visit-detail-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>