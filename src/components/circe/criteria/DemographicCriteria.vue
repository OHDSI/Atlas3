<template>
  <v-card
    class="demographic-criteria"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="demographic-criteria__header d-flex align-center ga-3 py-3">
      <div class="demographic-criteria__title-block d-flex align-center ga-3 flex-wrap">
        <div class="demographic-criteria__type">
          {{ demographicTitle }}
        </div>
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
            class="demographic-criteria__add-attribute-button"
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
import type { ConceptArray, ConceptSetSelection, DateRange, DemographicCriteria, NumericRange } from '@/models/circe-types'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
import type { ConceptArrayBinding, ConceptSetOption, ConceptSetSelectionTarget, CriteriaAttributeSpec } from './criteria-editor.types'

const props = defineProps<{
  criteria: DemographicCriteria
  conceptSets: ConceptSetOption[]
}>()

const emit = defineEmits<{
  remove: []
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

const demographicTitle = computed(() => 'Demographic Criteria')
const addAttributeLabel = computed(() => 'Add attribute...')
const selectConceptSetLabel = computed(() => 'Select Concept Set')

const demographicCriteriaData = computed<DemographicCriteria>(() => props.criteria)

function hasAttribute(key: keyof DemographicCriteria): boolean {
  return demographicCriteriaData.value[key] != null
}

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'Age',
    label: 'Age',
    description: 'Filter by age',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(demographicCriteriaData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(demographicCriteriaData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete demographicCriteriaData.value.Age
    },
    isActive: () => hasAttribute('Age'),
  },
  {
    key: 'Gender',
    label: 'Gender',
    description: 'Filter by gender',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(demographicCriteriaData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      demographicCriteriaData.value.Gender = [] as ConceptArray
    },
    clear: () => {
      delete demographicCriteriaData.value.Gender
    },
    isActive: () => hasAttribute('Gender'),
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(demographicCriteriaData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(demographicCriteriaData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete demographicCriteriaData.value.GenderCS
    },
    isActive: () => hasAttribute('GenderCS'),
  },
  {
    key: 'Race',
    label: 'Race',
    description: 'Filter by race',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(demographicCriteriaData.value, 'Race'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      demographicCriteriaData.value.Race = [] as ConceptArray
    },
    clear: () => {
      delete demographicCriteriaData.value.Race
    },
    isActive: () => hasAttribute('Race'),
  },
  {
    key: 'RaceCS',
    label: 'Race Concept Set',
    description: 'Filter race by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(demographicCriteriaData.value, 'RaceCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(demographicCriteriaData.value, 'RaceCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete demographicCriteriaData.value.RaceCS
    },
    isActive: () => hasAttribute('RaceCS'),
  },
  {
    key: 'Ethnicity',
    label: 'Ethnicity',
    description: 'Filter by ethnicity',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(demographicCriteriaData.value, 'Ethnicity'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      demographicCriteriaData.value.Ethnicity = [] as ConceptArray
    },
    clear: () => {
      delete demographicCriteriaData.value.Ethnicity
    },
    isActive: () => hasAttribute('Ethnicity'),
  },
  {
    key: 'EthnicityCS',
    label: 'Ethnicity Concept Set',
    description: 'Filter ethnicity by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(demographicCriteriaData.value, 'EthnicityCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(demographicCriteriaData.value, 'EthnicityCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete demographicCriteriaData.value.EthnicityCS
    },
    isActive: () => hasAttribute('EthnicityCS'),
  },
  {
    key: 'OccurrenceStartDate',
    label: 'Occurrence Start Date',
    description: 'Filter by occurrence start date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(demographicCriteriaData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(demographicCriteriaData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete demographicCriteriaData.value.OccurrenceStartDate
    },
    isActive: () => hasAttribute('OccurrenceStartDate'),
  },
  {
    key: 'OccurrenceEndDate',
    label: 'Occurrence End Date',
    description: 'Filter by occurrence end date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(demographicCriteriaData.value, 'OccurrenceEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(demographicCriteriaData.value, 'OccurrenceEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete demographicCriteriaData.value.OccurrenceEndDate
    },
    isActive: () => hasAttribute('OccurrenceEndDate'),
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

function addAttribute(attribute: CriteriaAttributeSpec) {
  attribute.init()
}
</script>

<style scoped>
.demographic-criteria {
  margin-bottom: 12px;
}

.demographic-criteria__header {
  min-height: 56px;
}

.demographic-criteria__type {
  font-weight: 600;
}
</style>