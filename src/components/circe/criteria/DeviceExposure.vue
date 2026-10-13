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
import { useI18n } from '@/composables/useI18n'
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
import { createConceptSetComponentProps, createDefaultCriteriaGroup, createConceptSetModel, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
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

const { t } = useI18n()
const deviceExposureTitle = computed(() => t('components.deviceExposure.title').value)
const addAttributeLabel = computed(() => t('components.criteria.addAttribute').value)
const selectConceptSetLabel = computed(() => t('components.criteria.selectConceptSet').value)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: t('components.deviceExposure.attributes.first.label').value,
    description: t('components.deviceExposure.attributes.first.description').value,
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
    label: t('criteriaAttributes.age.label').value,
    description: t('criteriaAttributes.age.description').value,
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
    label: t('criteriaAttributes.gender.label').value,
    description: t('criteriaAttributes.gender.description').value,
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
    label: t('criteriaAttributes.genderCS.label').value,
    description: t('criteriaAttributes.genderCS.description').value,
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
    label: t('criteriaAttributes.occurrenceStartDate.label').value,
    description: t('criteriaAttributes.occurrenceStartDate.description').value,
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
    label: t('criteriaAttributes.occurrenceEndDate.label').value,
    description: t('criteriaAttributes.occurrenceEndDate.description').value,
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
    label: t('criteriaAttributes.dateAdjustment.label').value,
    description: t('criteriaAttributes.dateAdjustment.description').value,
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
    label: t('criteriaAttributes.deviceType.label').value,
    description: t('criteriaAttributes.deviceType.description').value,
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
    isActive: () => deviceExposureData.value.DeviceType != null,
  },
  {
    key: 'DeviceTypeCS',
    label: t('criteriaAttributes.deviceTypeCS.label').value,
    description: t('criteriaAttributes.deviceTypeCS.description').value,
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
    label: t('components.deviceExposure.attributes.visitType.label').value,
    description: t('components.deviceExposure.attributes.visitType.description').value,
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
    label: t('criteriaAttributes.visitTypeCS.label').value,
    description: t('criteriaAttributes.visitTypeCS.description').value,
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
    label: t('criteriaAttributes.uniqueDeviceId.label').value,
    description: t('criteriaAttributes.uniqueDeviceId.description').value,
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
    label: t('criteriaAttributes.quantity.label').value,
    description: t('criteriaAttributes.quantity.description').value,
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
    label: t('criteriaAttributes.deviceSourceConcept.label').value,
    description: t('criteriaAttributes.deviceSourceConcept.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      deviceSourceConceptModel as ConceptSetSelection,
      props.conceptSets,
      'Select Source Concept',
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      deviceSourceConceptModel.activate()
    },
    clear: () => {
      deviceSourceConceptModel.deactivate()
    },
    isActive: () => deviceSourceConceptModel.isActive(),
  },
  {
    key: 'ProviderSpecialty',
    label: t('criteriaAttributes.providerSpecialty.label').value,
    description: t('criteriaAttributes.providerSpecialty.description').value,
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
    label: t('criteriaAttributes.providerSpecialtyCS.label').value,
    description: t('criteriaAttributes.providerSpecialtyCS.description').value,
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
    label: t('criteriaAttributes.correlatedCriteria.label').value,
    description: t('criteriaAttributes.correlatedCriteria.description').value,
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(deviceExposureData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(deviceExposureData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup)
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

const deviceSourceConceptModel = createConceptSetModel(deviceExposure, 'DeviceSourceConcept')

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