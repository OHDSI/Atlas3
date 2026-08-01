<template>
  <v-card
    class="dose-era-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="dose-era-editor__header d-flex align-center ga-3 py-3">
      <div class="dose-era-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="dose-era-editor__type">
          {{ eraTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="doseEraConceptSetModel"
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
            class="dose-era-editor__add-attribute-button"
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
import type { Criteria, CriteriaGroup, DateRange, NumericRange, ConceptSetSelection } from '../circe.types'
import EventConceptSet from '../input/EventConceptSet.vue'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
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

const eraTitle = computed(() => 'a dose era of')
const addAttributeLabel = computed(() => 'Add attribute...')
const selectConceptSetLabel = computed(() => 'Select Concept Set')

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: 'First Dose Era',
    description: 'Limit to first dose era in history',
    init: () => {
      doseEraData.value.First = true
    },
    clear: () => {
      delete doseEraData.value.First
    },
    isActive: () => doseEraData.value.First === true,
  },
  {
    key: 'AgeAtStart',
    label: 'Age at Start',
    description: 'Filter by age at era start',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(doseEraData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete doseEraData.value.AgeAtStart
    },
    isActive: () => 'AgeAtStart' in doseEraData.value,
  },
  {
    key: 'AgeAtEnd',
    label: 'Age at End',
    description: 'Filter by age at era end',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(doseEraData.value, 'AgeAtEnd', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'AgeAtEnd', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete doseEraData.value.AgeAtEnd
    },
    isActive: () => 'AgeAtEnd' in doseEraData.value,
  },
  {
    key: 'Gender',
    label: 'Gender',
    description: 'Filter by patient gender',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(doseEraData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      ensureObjectField(doseEraData.value, 'Gender', () => [])
    },
    clear: () => {
      delete doseEraData.value.Gender
    },
    isActive: () => 'Gender' in doseEraData.value,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(doseEraData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      'Select Concept Set',
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete doseEraData.value.GenderCS
    },
    isActive: () => 'GenderCS' in doseEraData.value,
  },
  {
    key: 'EraStartDate',
    label: 'Start Date',
    description: 'Filter by start date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(doseEraData.value, 'EraStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'EraStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete doseEraData.value.EraStartDate
    },
    isActive: () => 'EraStartDate' in doseEraData.value,
  },
  {
    key: 'EraEndDate',
    label: 'End Date',
    description: 'Filter by end date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(doseEraData.value, 'EraEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'EraEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete doseEraData.value.EraEndDate
    },
    isActive: () => 'EraEndDate' in doseEraData.value,
  },
  {
    key: 'DoseValue',
    label: 'Dose Value',
    description: 'Filter by dose amount',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(doseEraData.value, 'DoseValue', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'DoseValue', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete doseEraData.value.DoseValue
    },
    isActive: () => 'DoseValue' in doseEraData.value,
  },
  {
    key: 'EraLength',
    label: 'Era Length',
    description: 'Filter by era duration',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(doseEraData.value, 'EraLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'EraLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete doseEraData.value.EraLength
    },
    isActive: () => 'EraLength' in doseEraData.value,
  },
  {
    key: 'Unit',
    label: 'Unit',
    description: 'Filter by dosing unit',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(doseEraData.value, 'Unit'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      ensureObjectField(doseEraData.value, 'Unit', () => [])
    },
    clear: () => {
      delete doseEraData.value.Unit
    },
    isActive: () => 'Unit' in doseEraData.value,
  },
  {
    key: 'UnitCS',
    label: 'Unit Concept Set',
    description: 'Filter unit by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(doseEraData.value, 'UnitCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      'Select Concept Set',
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'UnitCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete doseEraData.value.UnitCS
    },
    isActive: () => 'UnitCS' in doseEraData.value,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Add nested criteria group',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(doseEraData.value, 'CorrelatedCriteria', () => ({})) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(doseEraData.value, 'CorrelatedCriteria', () => ({}))
    },
    clear: () => {
      delete doseEraData.value.CorrelatedCriteria
    },
    isActive: () => 'CorrelatedCriteria' in doseEraData.value,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const doseEraData = computed<Record<string, any>>(() => {
  const criteria = props.criteria as Record<string, any>
  if (!criteria.DoseEra) {
    criteria.DoseEra = {}
  }
  return criteria.DoseEra
})

const doseEraConceptSetModel = {
  get CodesetId() {
    return doseEraData.value.CodesetId
  },
  set CodesetId(value: number | undefined) {
    doseEraData.value.CodesetId = value
  },
} as ConceptSetSelection

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.dose-era-editor__type {
  font-weight: 600;
}

.dose-era-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>