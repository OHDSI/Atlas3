<template>
  <v-card
    class="drug-era-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="drug-era-editor__header d-flex align-center ga-3 py-3">
      <div class="drug-era-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="drug-era-editor__type">
          {{ eraTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="drugEraConceptSetModel"
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
            class="drug-era-editor__add-attribute-button"
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
import type { Criteria, CriteriaGroup, DateRange, NumericRange, ConceptSetSelection } from '../circe.types'
import EventConceptSet from '../input/EventConceptSet.vue'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createConceptSetModel, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
import type { ConceptArrayBinding, ConceptSetOption, ConceptSetSelectionTarget } from './criteria-editor.types'
import type { CriteriaAttributeSpec } from './criteria-editor.types'

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

const eraTitle = computed(() => 'a drug era of')
const addAttributeLabel = computed(() => 'Add attribute...')
const selectConceptSetLabel = computed(() => 'Select Concept Set')

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: 'First Drug Era',
    description: 'Limit to first drug era in history',
    init: () => {
      drugEraData.value.First = true
    },
    clear: () => {
      delete drugEraData.value.First
    },
    isActive: () => drugEraData.value.First === true,
  },
  {
    key: 'AgeAtStart',
    label: 'Age at Start',
    description: 'Filter by age at era start',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugEraData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(drugEraData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete drugEraData.value.AgeAtStart
    },
    isActive: () => drugEraData.value.AgeAtStart != null,
  },
  {
    key: 'AgeAtEnd',
    label: 'Age at End',
    description: 'Filter by age at era end',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugEraData.value, 'AgeAtEnd', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(drugEraData.value, 'AgeAtEnd', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete drugEraData.value.AgeAtEnd
    },
    isActive: () => drugEraData.value.AgeAtEnd != null,
  },
  {
    key: 'Gender',
    label: 'Gender',
    description: 'Filter by patient gender',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(drugEraData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      ensureObjectField(drugEraData.value, 'Gender', () => [])
    },
    clear: () => {
      delete drugEraData.value.Gender
    },
    isActive: () => drugEraData.value.Gender != null,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(drugEraData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(drugEraData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete drugEraData.value.GenderCS
    },
    isActive: () => drugEraData.value.GenderCS != null,
  },
  {
    key: 'EraStartDate',
    label: 'Start Date',
    description: 'Filter by start date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugEraData.value, 'EraStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(drugEraData.value, 'EraStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete drugEraData.value.EraStartDate
    },
    isActive: () => drugEraData.value.EraStartDate != null,
  },
  {
    key: 'EraEndDate',
    label: 'End Date',
    description: 'Filter by end date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugEraData.value, 'EraEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(drugEraData.value, 'EraEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete drugEraData.value.EraEndDate
    },
    isActive: () => drugEraData.value.EraEndDate != null,
  },
  {
    key: 'OccurrenceCount',
    label: 'Occurrence Count',
    description: 'Filter by occurrence count',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugEraData.value, 'OccurrenceCount', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(drugEraData.value, 'OccurrenceCount', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete drugEraData.value.OccurrenceCount
    },
    isActive: () => drugEraData.value.OccurrenceCount != null,
  },
  {
    key: 'GapDays',
    label: 'Gap Days',
    description: 'Filter by gap between eras',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugEraData.value, 'GapDays', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(drugEraData.value, 'GapDays', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete drugEraData.value.GapDays
    },
    isActive: () => drugEraData.value.GapDays != null,
  },
  {
    key: 'EraLength',
    label: 'Era Length',
    description: 'Filter by era duration',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugEraData.value, 'EraLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(drugEraData.value, 'EraLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete drugEraData.value.EraLength
    },
    isActive: () => drugEraData.value.EraLength != null,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Add nested criteria group',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(drugEraData.value, 'CorrelatedCriteria', () => ({})) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(drugEraData.value, 'CorrelatedCriteria', () => ({}))
    },
    clear: () => {
      delete drugEraData.value.CorrelatedCriteria
    },
    isActive: () => drugEraData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const drugEraData = computed<Record<string, any>>(() => {
  const criteria = props.criteria as Record<string, any>
  if (!criteria.DrugEra) {
    criteria.DrugEra = {}
  }
  return criteria.DrugEra
})

const drugEra = () => drugEraData.value

const drugEraConceptSetModel = createConceptSetModel(drugEra, 'CodesetId') as ConceptSetSelection

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.drug-era-editor__type {
  font-weight: 600;
}

.drug-era-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>