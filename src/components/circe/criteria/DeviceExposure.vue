<template>
  <v-card
    class="device-exposure-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="device-exposure-editor__header d-flex align-center ga-3 py-3">
      <div class="device-exposure-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="device-exposure-editor__type">
          {{ deviceExposureTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="deviceExposureConceptSetModel"
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
            class="device-exposure-editor__add-attribute-button"
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
import EventConceptSet from '../input/EventConceptSet.vue'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createConceptSetModel, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
import type { ConceptArrayBinding, ConceptSetOption, ConceptSetSelectionTarget, CriteriaAttributeSpec } from './criteria-editor.types'
import type { ConceptArray, Criteria, CriteriaGroup, DeviceExposure, ConceptSetSelection, DateAdjustment, DateRange, NumericRange, TextFilter } from '@/models/circe-types'

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

const deviceExposureTitle = computed(() => 'a device exposure of')
const addAttributeLabel = computed(() => 'Add attribute...')
const selectConceptSetLabel = computed(() => 'Select Concept Set')

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: 'First Exposure',
    description: 'Limit to first exposure in history',
    init: () => {
      deviceExposureData.value.First = true
    },
    clear: () => {
      delete deviceExposureData.value.First
    },
    isActive: () => deviceExposureData.value.First === true,
  },
  {
    key: 'Age',
    label: 'Age',
    description: 'Filter by age at time of event',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(deviceExposureData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(deviceExposureData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete deviceExposureData.value.Age
    },
    isActive: () => deviceExposureData.value.Age != null,
  },
  {
    key: 'Gender',
    label: 'Gender',
    description: 'Filter by patient gender',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(deviceExposureData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      deviceExposureData.value.Gender = [] as ConceptArray
    },
    clear: () => {
      delete deviceExposureData.value.Gender
    },
    isActive: () => deviceExposureData.value.Gender != null,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(deviceExposureData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(deviceExposureData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete deviceExposureData.value.GenderCS
    },
    isActive: () => deviceExposureData.value.GenderCS != null,
  },
  {
    key: 'OccurrenceStartDate',
    label: 'Start Date',
    description: 'Filter by start date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(deviceExposureData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(deviceExposureData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete deviceExposureData.value.OccurrenceStartDate
    },
    isActive: () => deviceExposureData.value.OccurrenceStartDate != null,
  },
  {
    key: 'OccurrenceEndDate',
    label: 'End Date',
    description: 'Filter by end date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(deviceExposureData.value, 'OccurrenceEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(deviceExposureData.value, 'OccurrenceEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete deviceExposureData.value.OccurrenceEndDate
    },
    isActive: () => deviceExposureData.value.OccurrenceEndDate != null,
  },
  {
    key: 'DateAdjustment',
    label: 'Date Adjustment',
    description: 'Adjust event dates',
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(deviceExposureData.value, 'DateAdjustment', createDefaultDateAdjustment) as DateAdjustment
    ),
    init: () => {
      ensureObjectField(deviceExposureData.value, 'DateAdjustment', createDefaultDateAdjustment)
    },
    clear: () => {
      delete deviceExposureData.value.DateAdjustment
    },
    isActive: () => deviceExposureData.value.DateAdjustment != null,
  },
  {
    key: 'DeviceType',
    label: 'Device Type',
    description: 'Filter by device type',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(deviceExposureData.value, 'DeviceType'),
        exclude: toRef(deviceExposureData.value, 'DeviceTypeExclude'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      deviceExposureData.value.DeviceType = [] as ConceptArray
      deviceExposureData.value.DeviceTypeExclude = false
    },
    clear: () => {
      delete deviceExposureData.value.DeviceType
      delete deviceExposureData.value.DeviceTypeExclude
    },
    isActive: () => deviceExposureData.value.DeviceType != null || deviceExposureData.value.DeviceTypeExclude != null,
  },
  {
    key: 'DeviceTypeCS',
    label: 'Device Type Concept Set',
    description: 'Filter device type by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(deviceExposureData.value, 'DeviceTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(deviceExposureData.value, 'DeviceTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete deviceExposureData.value.DeviceTypeCS
    },
    isActive: () => deviceExposureData.value.DeviceTypeCS != null,
  },
  {
    key: 'VisitType',
    label: 'Visit',
    description: 'Filter based on visit occurrence',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(deviceExposureData.value, 'VisitType'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      deviceExposureData.value.VisitType = [] as ConceptArray
    },
    clear: () => {
      delete deviceExposureData.value.VisitType
    },
    isActive: () => deviceExposureData.value.VisitType != null,
  },
  {
    key: 'VisitTypeCS',
    label: 'Visit Type Concept Set',
    description: 'Filter visit type by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(deviceExposureData.value, 'VisitTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(deviceExposureData.value, 'VisitTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete deviceExposureData.value.VisitTypeCS
    },
    isActive: () => deviceExposureData.value.VisitTypeCS != null,
  },
  {
    key: 'UniqueDeviceId',
    label: 'Unique Device ID',
    description: 'Filter by unique device identifier',
    kind: 'textFilter',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(deviceExposureData.value, 'UniqueDeviceId', (): TextFilter => ({ Text: '', Op: 'contains' })) as TextFilter
    ),
    init: () => {
      ensureObjectField(deviceExposureData.value, 'UniqueDeviceId', (): TextFilter => ({ Text: '', Op: 'contains' }))
    },
    clear: () => {
      delete deviceExposureData.value.UniqueDeviceId
    },
    isActive: () => deviceExposureData.value.UniqueDeviceId != null,
  },
  {
    key: 'Quantity',
    label: 'Quantity',
    description: 'Filter by quantity',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(deviceExposureData.value, 'Quantity', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(deviceExposureData.value, 'Quantity', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete deviceExposureData.value.Quantity
    },
    isActive: () => deviceExposureData.value.Quantity != null,
  },
  {
    key: 'DeviceSourceConcept',
    label: 'Device Source Concept',
    description: 'Filter by device source concept',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      deviceSourceConceptModel,
      props.conceptSets,
      'Select Source Concept',
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      deviceExposureData.value.DeviceSourceConcept = undefined
    },
    clear: () => {
      delete deviceExposureData.value.DeviceSourceConcept
    },
    isActive: () => deviceExposureData.value.DeviceSourceConcept != null,
  },
  {
    key: 'ProviderSpecialty',
    label: 'Provider Specialty',
    description: 'Filter by provider specialty',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(deviceExposureData.value, 'ProviderSpecialty'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      deviceExposureData.value.ProviderSpecialty = [] as ConceptArray
    },
    clear: () => {
      delete deviceExposureData.value.ProviderSpecialty
    },
    isActive: () => deviceExposureData.value.ProviderSpecialty != null,
  },
  {
    key: 'ProviderSpecialtyCS',
    label: 'Provider Specialty Concept Set',
    description: 'Filter provider specialty by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(deviceExposureData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(deviceExposureData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete deviceExposureData.value.ProviderSpecialtyCS
    },
    isActive: () => deviceExposureData.value.ProviderSpecialtyCS != null,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Add nested criteria group',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(deviceExposureData.value, 'CorrelatedCriteria', () => ({})) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(deviceExposureData.value, 'CorrelatedCriteria', () => ({}))
    },
    clear: () => {
      delete deviceExposureData.value.CorrelatedCriteria
    },
    isActive: () => deviceExposureData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const deviceExposureData = computed<DeviceExposure>(() => {
  const criteria = props.criteria as { DeviceExposure?: DeviceExposure }
  if (!criteria.DeviceExposure) {
    criteria.DeviceExposure = {} as DeviceExposure
  }
  return criteria.DeviceExposure
})

const deviceExposure = () => deviceExposureData.value

const deviceExposureConceptSetModel = createConceptSetModel(deviceExposure, 'CodesetId') as ConceptSetSelection

const deviceSourceConceptModel = createConceptSetModel(deviceExposure, 'DeviceSourceConcept') as ConceptSetSelection

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.device-exposure-editor__type {
  font-weight: 600;
}

.device-exposure-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>