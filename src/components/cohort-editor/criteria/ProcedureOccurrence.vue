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

      <v-spacer />

      <v-menu
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

        <v-list density="compact">
          <v-list-item
            v-for="attr in availableAttributes"
            :key="attr.key"
            :title="attr.label"
            :subtitle="attr.description"
            @click="addAttribute(attr)"
          />
        </v-list>
      </v-menu>

      <v-btn
        icon="mdi-delete"
        variant="text"
        color="error"
        size="small"
        @click="emit('remove')"
      />
    </v-card-text>

    <v-divider />

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
import { AtlasButton } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { Criteria, CriteriaGroup, ConceptSetSelection, DateAdjustment, DateRange, NumericRange } from '../circe.types'
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

const procedureOccurrenceTitle = computed(() => 'a procedure occurrence of')
const addAttributeLabel = computed(() => 'Add attribute...')
const selectConceptSetLabel = computed(() => t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: 'First Procedure',
    description: 'Limit to first procedure in history',
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
    label: 'Procedure Date',
    description: 'Filter by procedure date',
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
    isActive: () => 'OccurrenceStartDate' in procedureOccurrenceData.value,
  },
  {
    key: 'ProcedureType',
    label: 'Procedure Type',
    description: 'Filter by procedure type',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(procedureOccurrenceData.value, 'ProcedureType'),
        exclude: toRef(procedureOccurrenceData.value, 'ProcedureTypeExclude'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      procedureOccurrenceData.value.ProcedureType = []
      procedureOccurrenceData.value.ProcedureTypeExclude = false
    },
    clear: () => {
      delete procedureOccurrenceData.value.ProcedureType
      delete procedureOccurrenceData.value.ProcedureTypeExclude
    },
    isActive: () => 'ProcedureType' in procedureOccurrenceData.value || 'ProcedureTypeExclude' in procedureOccurrenceData.value,
  },
  {
    key: 'ProcedureTypeCS',
    label: 'Procedure Type Concept Set',
    description: 'Filter procedure type by a concept set',
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
    isActive: () => 'ProcedureTypeCS' in procedureOccurrenceData.value,
  },
  {
    key: 'Modifier',
    label: 'Modifier',
    description: 'Filter by modifier',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(procedureOccurrenceData.value, 'Modifier'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      procedureOccurrenceData.value.Modifier = []
    },
    clear: () => {
      delete procedureOccurrenceData.value.Modifier
    },
    isActive: () => 'Modifier' in procedureOccurrenceData.value,
  },
  {
    key: 'ModifierCS',
    label: 'Modifier Concept Set',
    description: 'Filter modifier by a concept set',
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
    isActive: () => 'ModifierCS' in procedureOccurrenceData.value,
  },
  {
    key: 'Quantity',
    label: 'Quantity',
    description: 'Filter by quantity',
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
    isActive: () => 'Quantity' in procedureOccurrenceData.value,
  },
  {
    key: 'ProcedureSourceConcept',
    label: 'Procedure Source Concept',
    description: 'Filter by procedure source concept',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(procedureOccurrenceData.value, 'ProcedureSourceConcept') as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      procedureOccurrenceData.value.ProcedureSourceConcept = undefined
    },
    clear: () => {
      delete procedureOccurrenceData.value.ProcedureSourceConcept
    },
    isActive: () => 'ProcedureSourceConcept' in procedureOccurrenceData.value,
  },
  {
    key: 'Age',
    label: 'Age',
    description: 'Filter by age at time of event',
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
    isActive: () => 'Age' in procedureOccurrenceData.value,
  },
  {
    key: 'Gender',
    label: 'Gender',
    description: 'Filter by patient gender',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(procedureOccurrenceData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      procedureOccurrenceData.value.Gender = []
    },
    clear: () => {
      delete procedureOccurrenceData.value.Gender
    },
    isActive: () => 'Gender' in procedureOccurrenceData.value,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
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
    isActive: () => 'GenderCS' in procedureOccurrenceData.value,
  },
  {
    key: 'ProviderSpecialty',
    label: 'Provider Specialty',
    description: 'Filter by provider specialty',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(procedureOccurrenceData.value, 'ProviderSpecialty'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      procedureOccurrenceData.value.ProviderSpecialty = []
    },
    clear: () => {
      delete procedureOccurrenceData.value.ProviderSpecialty
    },
    isActive: () => 'ProviderSpecialty' in procedureOccurrenceData.value,
  },
  {
    key: 'ProviderSpecialtyCS',
    label: 'Provider Specialty Concept Set',
    description: 'Filter provider specialty by a concept set',
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
    isActive: () => 'ProviderSpecialtyCS' in procedureOccurrenceData.value,
  },
  {
    key: 'VisitType',
    label: 'Visit Type',
    description: 'Filter by visit type',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(procedureOccurrenceData.value, 'VisitType'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      procedureOccurrenceData.value.VisitType = []
    },
    clear: () => {
      delete procedureOccurrenceData.value.VisitType
    },
    isActive: () => 'VisitType' in procedureOccurrenceData.value,
  },
  {
    key: 'VisitTypeCS',
    label: 'Visit Type Concept Set',
    description: 'Filter visit type by a concept set',
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
    isActive: () => 'VisitTypeCS' in procedureOccurrenceData.value,
  },
  {
    key: 'DateAdjustment',
    label: 'Date Adjustment',
    description: 'Adjust event dates',
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
    isActive: () => 'DateAdjustment' in procedureOccurrenceData.value,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Add nested criteria group',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(procedureOccurrenceData.value, 'CorrelatedCriteria', () => ({})) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(procedureOccurrenceData.value, 'CorrelatedCriteria', () => ({}))
    },
    clear: () => {
      delete procedureOccurrenceData.value.CorrelatedCriteria
    },
    isActive: () => 'CorrelatedCriteria' in procedureOccurrenceData.value,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const procedureOccurrenceData = computed<Record<string, any>>(() => {
  const criteria = props.criteria as Record<string, any>
  if (!criteria.ProcedureOccurrence) {
    criteria.ProcedureOccurrence = {}
  }
  return criteria.ProcedureOccurrence
})

const procedureOccurrenceConceptSetModel = createConceptSetModel(procedureOccurrenceData.value, 'CodesetId') as ConceptSetSelection

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