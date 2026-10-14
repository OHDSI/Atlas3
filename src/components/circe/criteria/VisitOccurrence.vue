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
import { createConceptSetComponentProps, createDefaultCriteriaGroup, createConceptSetModel, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
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

const visitOccurrenceTitle = computed(() => t('components.visitOccurrence.title').value)
const addAttributeLabel = computed(() => t('components.criteria.addAttribute').value)
const selectConceptSetLabel = computed(() => t('components.conceptAddBox.selectConceptSet').value)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: t('components.visitOccurrence.attributes.first.label').value,
    description: t('components.visitOccurrence.attributes.first.description').value,
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
    label: t('components.visitOccurrence.attributes.occurrenceStartDate.label').value,
    description: t('criteriaAttributes.occurrenceStartDate.description').value,
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
    label: t('components.visitOccurrence.attributes.occurrenceEndDate.label').value,
    description: t('criteriaAttributes.occurrenceEndDate.description').value,
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
    label: t('criteriaAttributes.visitType.label').value,
    description: t('criteriaAttributes.visitType.description').value,
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
    isActive: () => visitOccurrenceData.value.VisitType != null || visitOccurrenceData.value.VisitTypeExclude === true,
  },
  {
    key: 'VisitTypeCS',
    label: t('criteriaAttributes.visitTypeCS.label').value,
    description: t('criteriaAttributes.visitTypeCS.description').value,
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
    label: t('criteriaAttributes.visitSourceConcept.label').value,
    description: t('criteriaAttributes.visitSourceConcept.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      visitSourceConceptModel as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      visitSourceConceptModel.activate()
    },
    clear: () => {
      visitSourceConceptModel.deactivate()
    },
    isActive: () => visitSourceConceptModel.isActive(),
  },
  {
    key: 'VisitLength',
    label: t('criteriaAttributes.visitLength.label').value,
    description: t('criteriaAttributes.visitLength.description').value,
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
    label: t('criteriaAttributes.dateAdjustment.label').value,
    description: t('criteriaAttributes.dateAdjustment.description').value,
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
    label: t('criteriaAttributes.age.label').value,
    description: t('criteriaAttributes.age.description').value,
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
    label: t('criteriaAttributes.gender.label').value,
    description: t('criteriaAttributes.gender.description').value,
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
    label: t('criteriaAttributes.genderCS.label').value,
    description: t('criteriaAttributes.genderCS.description').value,
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
    label: t('criteriaAttributes.providerSpecialty.label').value,
    description: t('criteriaAttributes.providerSpecialty.description').value,
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
    label: t('criteriaAttributes.providerSpecialtyCS.label').value,
    description: t('criteriaAttributes.providerSpecialtyCS.description').value,
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
    label: t('criteriaAttributes.placeOfService.label').value,
    description: t('criteriaAttributes.placeOfService.description').value,
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
    label: t('criteriaAttributes.placeOfServiceCS.label').value,
    description: t('criteriaAttributes.placeOfServiceCS.description').value,
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
    label: t('criteriaAttributes.placeOfServiceLocation.label').value,
    description: t('criteriaAttributes.placeOfServiceLocation.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      placeOfServiceLocationModel as ConceptSetSelection,
      props.conceptSets,
      'Select Source Concept',
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      placeOfServiceLocationModel.activate()
    },
    clear: () => {
      placeOfServiceLocationModel.deactivate()
    },
    isActive: () => placeOfServiceLocationModel.isActive(),
  },
  {
    key: 'CorrelatedCriteria',
    label: t('criteriaAttributes.correlatedCriteria.label').value,
    description: t('criteriaAttributes.correlatedCriteria.description').value,
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(visitOccurrenceData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(visitOccurrenceData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup)
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
const visitSourceConceptModel = createConceptSetModel(visitOccurrence, 'VisitSourceConcept')
const placeOfServiceLocationModel = createConceptSetModel(visitOccurrence, 'PlaceOfServiceLocation')

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