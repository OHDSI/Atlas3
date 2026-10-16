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
import type { ConceptArray, Criteria, CriteriaGroup, ConceptSetSelection, DateAdjustment, DateRange, NumericRange, Observation, TextFilter } from '@/models/circe-types'
import EventConceptSet from '../input/EventConceptSet.vue'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createDefaultCriteriaGroup, createConceptSetModel, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
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

const { t } = useI18n()
const observationTitle = computed(() => t('components.observation.title').value)
const addAttributeLabel = computed(() => t('components.criteria.addAttribute').value)
const selectConceptSetLabel = computed(() => t('components.criteria.selectConceptSet').value)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: t('components.observation.attributes.first.label').value,
    description: t('components.observation.attributes.first.description').value,
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
    label: t('components.observation.attributes.occurrenceStartDate.label').value,
    description: t('components.observation.attributes.occurrenceStartDate.description').value,
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
    isActive: () => observationData.value.OccurrenceStartDate != null,
  },
  {
    key: 'ObservationType',
    label: t('criteriaAttributes.observationType.label').value,
    description: t('criteriaAttributes.observationType.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationData.value, 'ObservationType'),
        exclude: toRef(observationData.value, 'ObservationTypeExclude'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      observationData.value.ObservationType = [] as ConceptArray
      observationData.value.ObservationTypeExclude = false
    },
    clear: () => {
      delete observationData.value.ObservationType
      delete observationData.value.ObservationTypeExclude
    },
    isActive: () => observationData.value.ObservationType != null,
  },
  {
    key: 'ObservationTypeCS',
    label: t('criteriaAttributes.observationTypeCS.label').value,
    description: t('criteriaAttributes.observationTypeCS.description').value,
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
    isActive: () => observationData.value.ObservationTypeCS != null,
  },
  {
    key: 'ValueAsNumber',
    label: t('criteriaAttributes.valueAsNumber.label').value,
    description: t('criteriaAttributes.valueAsNumber.description').value,
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
    isActive: () => observationData.value.ValueAsNumber != null,
  },
  {
    key: 'DateAdjustment',
    label: t('criteriaAttributes.dateAdjustment.label').value,
    description: t('criteriaAttributes.dateAdjustment.description').value,
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
    isActive: () => observationData.value.DateAdjustment != null,
  },
  {
    key: 'ValueAsString',
    label: t('criteriaAttributes.valueAsString.label').value,
    description: t('criteriaAttributes.valueAsString.description').value,
    kind: 'textFilter',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationData.value, 'ValueAsString', (): TextFilter => ({ Text: '', Op: 'contains' })) as TextFilter
    ),
    init: () => {
      ensureObjectField(observationData.value, 'ValueAsString', (): TextFilter => ({ Text: '', Op: 'contains' }))
    },
    clear: () => {
      delete observationData.value.ValueAsString
    },
    isActive: () => observationData.value.ValueAsString != null,
  },
  {
    key: 'ValueAsConcept',
    label: t('criteriaAttributes.valueAsConcept.label').value,
    description: t('criteriaAttributes.valueAsConcept.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationData.value, 'ValueAsConcept'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      observationData.value.ValueAsConcept = [] as ConceptArray
    },
    clear: () => {
      delete observationData.value.ValueAsConcept
    },
    isActive: () => observationData.value.ValueAsConcept != null,
  },
  {
    key: 'ValueAsConceptCS',
    label: t('criteriaAttributes.valueAsConceptCS.label').value,
    description: t('criteriaAttributes.valueAsConceptCS.description').value,
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
    isActive: () => observationData.value.ValueAsConceptCS != null,
  },
  {
    key: 'Qualifier',
    label: t('criteriaAttributes.qualifier.label').value,
    description: t('criteriaAttributes.qualifier.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationData.value, 'Qualifier'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      observationData.value.Qualifier = [] as ConceptArray
    },
    clear: () => {
      delete observationData.value.Qualifier
    },
    isActive: () => observationData.value.Qualifier != null,
  },
  {
    key: 'QualifierCS',
    label: t('criteriaAttributes.qualifierCS.label').value,
    description: t('criteriaAttributes.qualifierCS.description').value,
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
    isActive: () => observationData.value.QualifierCS != null,
  },
  {
    key: 'Unit',
    label: t('criteriaAttributes.unit.label').value,
    description: t('criteriaAttributes.unit.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationData.value, 'Unit'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      observationData.value.Unit = [] as ConceptArray
    },
    clear: () => {
      delete observationData.value.Unit
    },
    isActive: () => observationData.value.Unit != null,
  },
  {
    key: 'UnitCS',
    label: t('criteriaAttributes.unitCS.label').value,
    description: t('criteriaAttributes.unitCS.description').value,
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
    isActive: () => observationData.value.UnitCS != null,
  },
  {
    key: 'ObservationSourceConcept',
    label: t('criteriaAttributes.observationSourceConcept.label').value,
    description: t('criteriaAttributes.observationSourceConcept.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      observationSourceConceptModel as ConceptSetSelection,
      props.conceptSets,
      'Select Source Concept',
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      observationSourceConceptModel.activate()
    },
    clear: () => {
      observationSourceConceptModel.deactivate()
    },
    isActive: () => observationSourceConceptModel.isActive(),
  },
  {
    key: 'Age',
    label: t('criteriaAttributes.age.label').value,
    description: t('criteriaAttributes.age.description').value,
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
    isActive: () => observationData.value.Age != null,
  },
  {
    key: 'Gender',
    label: t('criteriaAttributes.gender.label').value,
    description: t('criteriaAttributes.gender.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
      domainFilter: 'Gender',
    }),
    init: () => {
      observationData.value.Gender = [] as ConceptArray
    },
    clear: () => {
      delete observationData.value.Gender
    },
    isActive: () => observationData.value.Gender != null,
  },
  {
    key: 'GenderCS',
    label: t('criteriaAttributes.genderCS.label').value,
    description: t('criteriaAttributes.genderCS.description').value,
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
    isActive: () => observationData.value.GenderCS != null,
  },
  {
    key: 'ProviderSpecialty',
    label: t('criteriaAttributes.providerSpecialty.label').value,
    description: t('criteriaAttributes.providerSpecialty.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationData.value, 'ProviderSpecialty'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      observationData.value.ProviderSpecialty = [] as ConceptArray
    },
    clear: () => {
      delete observationData.value.ProviderSpecialty
    },
    isActive: () => observationData.value.ProviderSpecialty != null,
  },
  {
    key: 'ProviderSpecialtyCS',
    label: t('criteriaAttributes.providerSpecialtyCS.label').value,
    description: t('criteriaAttributes.providerSpecialtyCS.description').value,
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
    isActive: () => observationData.value.ProviderSpecialtyCS != null,
  },
  {
    key: 'VisitType',
    label: t('criteriaAttributes.visitType.label').value,
    description: t('criteriaAttributes.visitType.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationData.value, 'VisitType'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      observationData.value.VisitType = [] as ConceptArray
    },
    clear: () => {
      delete observationData.value.VisitType
    },
    isActive: () => observationData.value.VisitType != null,
  },
  {
    key: 'VisitTypeCS',
    label: t('criteriaAttributes.visitTypeCS.label').value,
    description: t('criteriaAttributes.visitTypeCS.description').value,
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
    isActive: () => observationData.value.VisitTypeCS != null,
  },
  {
    key: 'CorrelatedCriteria',
    label: t('criteriaAttributes.correlatedCriteria.label').value,
    description: t('criteriaAttributes.correlatedCriteria.description').value,
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(observationData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(observationData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup)
    },
    clear: () => {
      delete observationData.value.CorrelatedCriteria
    },
    isActive: () => observationData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const observationData = computed<Observation>(() => {
  const criteria = props.criteria as { Observation?: Observation }
  if (!criteria.Observation) {
    criteria.Observation = {} as Observation
  }
  return criteria.Observation
})

const observation = () => observationData.value

const observationConceptSetModel = createConceptSetModel(observation, 'CodesetId') as ConceptSetSelection

const observationSourceConceptModel = createConceptSetModel(observation, 'ObservationSourceConcept')

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