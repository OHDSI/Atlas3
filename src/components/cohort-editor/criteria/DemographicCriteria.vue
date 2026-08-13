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
import type { ConceptSetSelection, DateRange, DemographicCriteria as DemographicCriteriaModel, NumericRange } from '../circe.types'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
import type { ConceptArrayBinding, ConceptSetOption, ConceptSetSelectionTarget, CriteriaAttributeSpec } from './criteria-editor.types'

const props = defineProps<{
  criteria: DemographicCriteriaModel
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

const demographicData = computed<Record<string, any>>(() => props.criteria as Record<string, any>)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'Age',
    label: 'Age',
    description: 'Filter by age',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(demographicData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(demographicData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete demographicData.value.Age
    },
    isActive: () => 'Age' in demographicData.value,
  },
  {
    key: 'Gender',
    label: 'Gender',
    description: 'Filter by gender',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(demographicData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      demographicData.value.Gender = []
    },
    clear: () => {
      delete demographicData.value.Gender
    },
    isActive: () => 'Gender' in demographicData.value,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(demographicData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(demographicData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete demographicData.value.GenderCS
    },
    isActive: () => 'GenderCS' in demographicData.value,
  },
  {
    key: 'Race',
    label: 'Race',
    description: 'Filter by race',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(demographicData.value, 'Race'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      demographicData.value.Race = []
    },
    clear: () => {
      delete demographicData.value.Race
    },
    isActive: () => 'Race' in demographicData.value,
  },
  {
    key: 'RaceCS',
    label: 'Race Concept Set',
    description: 'Filter race by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(demographicData.value, 'RaceCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(demographicData.value, 'RaceCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete demographicData.value.RaceCS
    },
    isActive: () => 'RaceCS' in demographicData.value,
  },
  {
    key: 'Ethnicity',
    label: 'Ethnicity',
    description: 'Filter by ethnicity',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(demographicData.value, 'Ethnicity'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      demographicData.value.Ethnicity = []
    },
    clear: () => {
      delete demographicData.value.Ethnicity
    },
    isActive: () => 'Ethnicity' in demographicData.value,
  },
  {
    key: 'EthnicityCS',
    label: 'Ethnicity Concept Set',
    description: 'Filter ethnicity by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(demographicData.value, 'EthnicityCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(demographicData.value, 'EthnicityCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete demographicData.value.EthnicityCS
    },
    isActive: () => 'EthnicityCS' in demographicData.value,
  },
  {
    key: 'OccurrenceStartDate',
    label: 'Occurrence Start Date',
    description: 'Filter by occurrence start date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(demographicData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(demographicData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete demographicData.value.OccurrenceStartDate
    },
    isActive: () => 'OccurrenceStartDate' in demographicData.value,
  },
  {
    key: 'OccurrenceEndDate',
    label: 'Occurrence End Date',
    description: 'Filter by occurrence end date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(demographicData.value, 'OccurrenceEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(demographicData.value, 'OccurrenceEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete demographicData.value.OccurrenceEndDate
    },
    isActive: () => 'OccurrenceEndDate' in demographicData.value,
  },
])

// Exposed so the attribute-spec/schema cross-reference test can reach the spec list.
defineExpose({ attributeSpecs })

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