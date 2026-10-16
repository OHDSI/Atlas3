<template>
  <v-card
    class="procedure-occurrence-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="procedure-occurrence-editor__header d-flex align-center ga-3 py-3">
      <div class="procedure-occurrence-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="procedure-occurrence-editor__type">
          {{ procedureOccurrenceTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="procedureOccurrenceConceptSetModel"
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
            class="procedure-occurrence-editor__add-attribute-button"
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
import type { ConceptArray, Criteria, CriteriaGroup, ConceptSetSelection, DateAdjustment, DateRange, NumericRange, ProcedureOccurrence } from '@/models/circe-types'
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

const procedureOccurrenceTitle = computed(() => t('components.procedureOccurrence.title').value)
const addAttributeLabel = computed(() => t('components.criteria.addAttribute').value)
const selectConceptSetLabel = computed(() => t('components.conceptAddBox.selectConceptSet').value)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: t('components.procedureOccurrence.attributes.first.label').value,
    description: t('components.procedureOccurrence.attributes.first.description').value,
    init: () => {
      procedureOccurrenceData.value.First = true
    },
    clear: () => {
      delete procedureOccurrenceData.value.First
    },
    isActive: () => procedureOccurrenceData.value.First === true,
  },
  {
    key: 'OccurrenceStartDate',
    label: t('components.procedureOccurrence.attributes.occurrenceStartDate.label').value,
    description: t('components.procedureOccurrence.attributes.occurrenceStartDate.description').value,
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(procedureOccurrenceData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(procedureOccurrenceData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete procedureOccurrenceData.value.OccurrenceStartDate
    },
    isActive: () => procedureOccurrenceData.value.OccurrenceStartDate != null,
  },
  {
    key: 'ProcedureType',
    label: t('criteriaAttributes.procedureType.label').value,
    description: t('criteriaAttributes.procedureType.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(procedureOccurrenceData.value, 'ProcedureType'),
        exclude: toRef(procedureOccurrenceData.value, 'ProcedureTypeExclude'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      procedureOccurrenceData.value.ProcedureType = [] as ConceptArray
      procedureOccurrenceData.value.ProcedureTypeExclude = false
    },
    clear: () => {
      delete procedureOccurrenceData.value.ProcedureType
      delete procedureOccurrenceData.value.ProcedureTypeExclude
    },
    isActive: () => procedureOccurrenceData.value.ProcedureType != null,
  },
  {
    key: 'ProcedureTypeCS',
    label: t('criteriaAttributes.procedureTypeCS.label').value,
    description: t('criteriaAttributes.procedureTypeCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(procedureOccurrenceData.value, 'ProcedureTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(procedureOccurrenceData.value, 'ProcedureTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete procedureOccurrenceData.value.ProcedureTypeCS
    },
    isActive: () => procedureOccurrenceData.value.ProcedureTypeCS != null,
  },
  {
    key: 'Modifier',
    label: t('criteriaAttributes.modifier.label').value,
    description: t('criteriaAttributes.modifier.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(procedureOccurrenceData.value, 'Modifier'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      procedureOccurrenceData.value.Modifier = [] as ConceptArray
    },
    clear: () => {
      delete procedureOccurrenceData.value.Modifier
    },
    isActive: () => procedureOccurrenceData.value.Modifier != null,
  },
  {
    key: 'ModifierCS',
    label: t('criteriaAttributes.modifierCS.label').value,
    description: t('criteriaAttributes.modifierCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(procedureOccurrenceData.value, 'ModifierCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(procedureOccurrenceData.value, 'ModifierCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete procedureOccurrenceData.value.ModifierCS
    },
    isActive: () => procedureOccurrenceData.value.ModifierCS != null,
  },
  {
    key: 'Quantity',
    label: t('criteriaAttributes.quantity.label').value,
    description: t('criteriaAttributes.quantity.description').value,
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(procedureOccurrenceData.value, 'Quantity', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(procedureOccurrenceData.value, 'Quantity', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete procedureOccurrenceData.value.Quantity
    },
    isActive: () => procedureOccurrenceData.value.Quantity != null,
  },
  {
    key: 'ProcedureSourceConcept',
    label: t('criteriaAttributes.procedureSourceConcept.label').value,
    description: t('criteriaAttributes.procedureSourceConcept.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      procedureSourceConceptModel as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      procedureSourceConceptModel.activate()
    },
    clear: () => {
      procedureSourceConceptModel.deactivate()
    },
    isActive: () => procedureSourceConceptModel.isActive(),
  },
  {
    key: 'Age',
    label: t('criteriaAttributes.age.label').value,
    description: t('criteriaAttributes.age.description').value,
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(procedureOccurrenceData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(procedureOccurrenceData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete procedureOccurrenceData.value.Age
    },
    isActive: () => procedureOccurrenceData.value.Age != null,
  },
  {
    key: 'Gender',
    label: t('criteriaAttributes.gender.label').value,
    description: t('criteriaAttributes.gender.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(procedureOccurrenceData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
      domainFilter: 'Gender',
    }),
    init: () => {
      procedureOccurrenceData.value.Gender = [] as ConceptArray
    },
    clear: () => {
      delete procedureOccurrenceData.value.Gender
    },
    isActive: () => procedureOccurrenceData.value.Gender != null,
  },
  {
    key: 'GenderCS',
    label: t('criteriaAttributes.genderCS.label').value,
    description: t('criteriaAttributes.genderCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(procedureOccurrenceData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(procedureOccurrenceData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete procedureOccurrenceData.value.GenderCS
    },
    isActive: () => procedureOccurrenceData.value.GenderCS != null,
  },
  {
    key: 'ProviderSpecialty',
    label: t('criteriaAttributes.providerSpecialty.label').value,
    description: t('criteriaAttributes.providerSpecialty.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(procedureOccurrenceData.value, 'ProviderSpecialty'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      procedureOccurrenceData.value.ProviderSpecialty = [] as ConceptArray
    },
    clear: () => {
      delete procedureOccurrenceData.value.ProviderSpecialty
    },
    isActive: () => procedureOccurrenceData.value.ProviderSpecialty != null,
  },
  {
    key: 'ProviderSpecialtyCS',
    label: t('criteriaAttributes.providerSpecialtyCS.label').value,
    description: t('criteriaAttributes.providerSpecialtyCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(procedureOccurrenceData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(procedureOccurrenceData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete procedureOccurrenceData.value.ProviderSpecialtyCS
    },
    isActive: () => procedureOccurrenceData.value.ProviderSpecialtyCS != null,
  },
  {
    key: 'VisitType',
    label: t('criteriaAttributes.visitType.label').value,
    description: t('criteriaAttributes.visitType.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(procedureOccurrenceData.value, 'VisitType'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      procedureOccurrenceData.value.VisitType = [] as ConceptArray
    },
    clear: () => {
      delete procedureOccurrenceData.value.VisitType
    },
    isActive: () => procedureOccurrenceData.value.VisitType != null,
  },
  {
    key: 'VisitTypeCS',
    label: t('criteriaAttributes.visitTypeCS.label').value,
    description: t('criteriaAttributes.visitTypeCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(procedureOccurrenceData.value, 'VisitTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(procedureOccurrenceData.value, 'VisitTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete procedureOccurrenceData.value.VisitTypeCS
    },
    isActive: () => procedureOccurrenceData.value.VisitTypeCS != null,
  },
  {
    key: 'DateAdjustment',
    label: t('criteriaAttributes.dateAdjustment.label').value,
    description: t('criteriaAttributes.dateAdjustment.description').value,
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(procedureOccurrenceData.value, 'DateAdjustment', createDefaultDateAdjustment) as DateAdjustment
    ),
    init: () => {
      ensureObjectField(procedureOccurrenceData.value, 'DateAdjustment', createDefaultDateAdjustment)
    },
    clear: () => {
      delete procedureOccurrenceData.value.DateAdjustment
    },
    isActive: () => procedureOccurrenceData.value.DateAdjustment != null,
  },
  {
    key: 'CorrelatedCriteria',
    label: t('criteriaAttributes.correlatedCriteria.label').value,
    description: t('criteriaAttributes.correlatedCriteria.description').value,
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(procedureOccurrenceData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(procedureOccurrenceData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup)
    },
    clear: () => {
      delete procedureOccurrenceData.value.CorrelatedCriteria
    },
    isActive: () => procedureOccurrenceData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const procedureOccurrenceData = computed<ProcedureOccurrence>(() => {
  const criteria = props.criteria as { ProcedureOccurrence?: ProcedureOccurrence }
  if (!criteria.ProcedureOccurrence) {
    criteria.ProcedureOccurrence = {} as ProcedureOccurrence
  }
  return criteria.ProcedureOccurrence
})

const procedureOccurrence = () => procedureOccurrenceData.value

const procedureOccurrenceConceptSetModel = createConceptSetModel(procedureOccurrence, 'CodesetId') as ConceptSetSelection
const procedureSourceConceptModel = createConceptSetModel(procedureOccurrence, 'ProcedureSourceConcept')

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.procedure-occurrence-editor__type {
  font-weight: 600;
}

.procedure-occurrence-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>