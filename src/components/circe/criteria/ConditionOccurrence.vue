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
import type { ConditionOccurrence, Criteria, CriteriaGroup } from '@/models/circe-types'
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
import type { ConceptSetSelection, DateAdjustment, DateRange, NumericRange, TextFilter } from '@/models/circe-types'
import { createConceptSetComponentProps, createDefaultCriteriaGroup, createConceptSetModel, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'

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
  t('components.conditionOccurrence.title').value
)

const addAttributeLabel = computed(() =>
  t('components.criteria.addAttribute').value
)

const selectConceptSetLabel = computed(() =>
  t('components.conceptAddBox.selectConceptSet').value
)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: t('criteriaAttributes.first.label').value,
    description: t('criteriaAttributes.first.description').value,
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
    label: t('criteriaAttributes.age.label').value,
    description: t('criteriaAttributes.age.description').value,
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
    isActive: () => conditionOccurrenceData.value.Age != null,
  },
  {
    key: 'Gender',
    label: t('criteriaAttributes.gender.label').value,
    description: t('criteriaAttributes.gender.description').value,
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
    isActive: () => conditionOccurrenceData.value.Gender != null,
  },
  {
    key: 'GenderCS',
    label: t('criteriaAttributes.genderCS.label').value,
    description: t('criteriaAttributes.genderCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(conditionOccurrenceData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete conditionOccurrenceData.value.GenderCS
    },
    isActive: () => conditionOccurrenceData.value.GenderCS != null,
  },
  {
    key: 'ConditionStatus',
    label: t('criteriaAttributes.conditionStatus.label').value,
    description: t('criteriaAttributes.conditionStatus.description').value,
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
    isActive: () => conditionOccurrenceData.value.ConditionStatus != null,
  },
  {
    key: 'ConditionStatusCS',
    label: t('criteriaAttributes.conditionStatusCS.label').value,
    description: t('criteriaAttributes.conditionStatusCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(conditionOccurrenceData.value, 'ConditionStatusCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'ConditionStatusCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete conditionOccurrenceData.value.ConditionStatusCS
    },
    isActive: () => conditionOccurrenceData.value.ConditionStatusCS != null,
  },
  {
    key: 'OccurrenceStartDate',
    label: t('components.conditionOccurrence.attributes.occurrenceStartDate.label').value,
    description: t('criteriaAttributes.occurrenceStartDate.description').value,
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
    isActive: () => conditionOccurrenceData.value.OccurrenceStartDate != null,
  },
  {
    key: 'OccurrenceEndDate',
    label: t('components.conditionOccurrence.attributes.occurrenceEndDate.label').value,
    description: t('criteriaAttributes.occurrenceEndDate.description').value,
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
    isActive: () => conditionOccurrenceData.value.OccurrenceEndDate != null,
  },
  {
    key: 'DateAdjustment',
    label: t('criteriaAttributes.dateAdjustment.label').value,
    description: t('criteriaAttributes.dateAdjustment.description').value,
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
    isActive: () => conditionOccurrenceData.value.DateAdjustment != null,
  },
  {
    key: 'ConditionType',
    label: t('criteriaAttributes.conditionType.label').value,
    description: t('criteriaAttributes.conditionType.description').value,
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
    isActive: () => conditionOccurrenceData.value.ConditionType != null || conditionOccurrenceData.value.ConditionTypeExclude != null,
  },
  {
    key: 'ConditionTypeCS',
    label: t('criteriaAttributes.conditionTypeCS.label').value,
    description: t('criteriaAttributes.conditionTypeCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(conditionOccurrenceData.value, 'ConditionTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'ConditionTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete conditionOccurrenceData.value.ConditionTypeCS
    },
    isActive: () => conditionOccurrenceData.value.ConditionTypeCS != null,
  },
  {
    key: 'VisitType',
    label: t('components.conditionOccurrence.attributes.visitType.label').value,
    description: t('components.conditionOccurrence.attributes.visitType.description').value,
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
    isActive: () => conditionOccurrenceData.value.VisitType != null,
  },
  {
    key: 'VisitTypeCS',
    label: t('criteriaAttributes.visitTypeCS.label').value,
    description: t('criteriaAttributes.visitTypeCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(conditionOccurrenceData.value, 'VisitTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'VisitTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete conditionOccurrenceData.value.VisitTypeCS
    },
    isActive: () => conditionOccurrenceData.value.VisitTypeCS != null,
  },
  {
    key: 'StopReason',
    label: t('criteriaAttributes.stopReason.label').value,
    description: t('criteriaAttributes.stopReason.description').value,
    kind: 'textFilter',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(conditionOccurrenceData.value, 'StopReason', (): TextFilter => ({ Text: '', Op: 'contains' })) as TextFilter
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'StopReason', (): TextFilter => ({ Text: '', Op: 'contains' }))
    },
    clear: () => {
      delete conditionOccurrenceData.value.StopReason
    },
    isActive: () => conditionOccurrenceData.value.StopReason != null,
  },
  {
    key: 'ProviderSpecialty',
    label: t('criteriaAttributes.providerSpecialty.label').value,
    description: t('criteriaAttributes.providerSpecialty.description').value,
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
    isActive: () => conditionOccurrenceData.value.ProviderSpecialty != null,
  },
  {
    key: 'ProviderSpecialtyCS',
    label: t('criteriaAttributes.providerSpecialtyCS.label').value,
    description: t('criteriaAttributes.providerSpecialtyCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(conditionOccurrenceData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete conditionOccurrenceData.value.ProviderSpecialtyCS
    },
    isActive: () => conditionOccurrenceData.value.ProviderSpecialtyCS != null,
  },
  {
    key: 'ConditionSourceConcept',
    label: t('criteriaAttributes.conditionSourceConcept.label').value,
    description: t('criteriaAttributes.conditionSourceConcept.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      conditionSourceConceptModel as ConceptSetSelection,
      props.conceptSets,
      t('components.eventCard.selectSourceConcept').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      conditionSourceConceptModel.activate()
    },
    clear: () => {
      conditionSourceConceptModel.deactivate()
    },
    isActive: () => conditionSourceConceptModel.isActive(),
  },
  {
    key: 'CorrelatedCriteria',
    label: t('criteriaAttributes.correlatedCriteria.label').value,
    description: t('criteriaAttributes.correlatedCriteria.description').value,
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(conditionOccurrenceData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(conditionOccurrenceData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup)
    },
    clear: () => {
      delete conditionOccurrenceData.value.CorrelatedCriteria
    },
    isActive: () => conditionOccurrenceData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))

const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))

const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const conditionOccurrenceData = computed<ConditionOccurrence>(() => {
  const criteria = props.criteria as { ConditionOccurrence?: ConditionOccurrence }
  if (!criteria.ConditionOccurrence) {
    criteria.ConditionOccurrence = {} as ConditionOccurrence
  }
  return criteria.ConditionOccurrence
})

const conditionOccurrence = () => conditionOccurrenceData.value

const conditionOccurrenceConceptSetModel = createConceptSetModel(conditionOccurrence, 'CodesetId') as ConceptSetSelection

const conditionSourceConceptModel = createConceptSetModel(conditionOccurrence, 'ConditionSourceConcept')

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
