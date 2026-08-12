<template>
  <v-card
    class="death-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="death-editor__header d-flex align-center ga-3 py-3">
      <div class="death-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="death-editor__type">
          {{ deathTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="deathConceptSetModel"
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
            class="death-editor__add-attribute-button"
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
import { createConceptSetComponentProps, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
import type { ConceptArrayBinding, ConceptSetOption, ConceptSetSelectionTarget, CriteriaAttributeSpec } from './criteria-editor.types'
import type { Criteria, CriteriaGroup, ConceptSetSelection, DateAdjustment, DateRange, NumericRange } from '../circe.types'

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

const deathTitle = computed(() => 'a death of')

const addAttributeLabel = computed(() => 'Add attribute...')

const selectConceptSetLabel = computed(() => t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'Age',
    label: 'Age',
    description: 'Filter by age at time of event',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(deathData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(deathData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete deathData.value.Age
    },
    isActive: () => 'Age' in deathData.value,
  },
  {
    key: 'Gender',
    label: 'Gender',
    description: 'Filter by patient gender',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(deathData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      deathData.value.Gender = []
    },
    clear: () => {
      delete deathData.value.Gender
    },
    isActive: () => 'Gender' in deathData.value,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(deathData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(deathData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete deathData.value.GenderCS
    },
    isActive: () => 'GenderCS' in deathData.value,
  },
  {
    key: 'OccurrenceStartDate',
    label: 'Death Date',
    description: 'Filter by date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(deathData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(deathData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete deathData.value.OccurrenceStartDate
    },
    isActive: () => 'OccurrenceStartDate' in deathData.value,
  },
  {
    key: 'DateAdjustment',
    label: 'Date Adjustment',
    description: 'Adjust event dates',
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(deathData.value, 'DateAdjustment', () => ({ StartWith: 'START_DATE', StartOffset: 0, EndWith: 'END_DATE', EndOffset: 0 })) as DateAdjustment
    ),
    init: () => {
      ensureObjectField(deathData.value, 'DateAdjustment', () => ({ StartWith: 'START_DATE', StartOffset: 0, EndWith: 'END_DATE', EndOffset: 0 }))
    },
    clear: () => {
      delete deathData.value.DateAdjustment
    },
    isActive: () => 'DateAdjustment' in deathData.value,
  },
  {
    key: 'DeathType',
    label: 'Death Type',
    description: 'Filter by death type',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(deathData.value, 'DeathType'),
        exclude: toRef(deathData.value, 'DeathTypeExclude'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      deathData.value.DeathType = []
      deathData.value.DeathTypeExclude = false
    },
    clear: () => {
      delete deathData.value.DeathType
      delete deathData.value.DeathTypeExclude
    },
    isActive: () => 'DeathType' in deathData.value || 'DeathTypeExclude' in deathData.value,
  },
  {
    key: 'DeathTypeCS',
    label: 'Death Type Concept Set',
    description: 'Filter death type by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(deathData.value, 'DeathTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(deathData.value, 'DeathTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete deathData.value.DeathTypeCS
    },
    isActive: () => 'DeathTypeCS' in deathData.value,
  },
  {
    key: 'DeathSourceConcept',
    label: 'Death Source Concept',
    description: 'Filter by death source concept',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      deathSourceConceptModel,
      props.conceptSets,
      t('components.eventCard.selectSourceConcept', 'Select Source Concept').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      deathData.value.DeathSourceConcept = undefined
    },
    clear: () => {
      delete deathData.value.DeathSourceConcept
    },
    isActive: () => 'DeathSourceConcept' in deathData.value,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Add nested criteria group',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(deathData.value, 'CorrelatedCriteria', () => ({})) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(deathData.value, 'CorrelatedCriteria', () => ({}))
    },
    clear: () => {
      delete deathData.value.CorrelatedCriteria
    },
    isActive: () => 'CorrelatedCriteria' in deathData.value,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const deathData = computed<Record<string, any>>(() => {
  const criteria = props.criteria as Record<string, any>
  if (!criteria.Death) {
    criteria.Death = {}
  }
  return criteria.Death
})

const deathConceptSetModel = {
  get CodesetId() {
    return deathData.value.CodesetId
  },
  set CodesetId(value: number | undefined) {
    deathData.value.CodesetId = value
  },
} as ConceptSetSelection

const deathSourceConceptModel = {
  get CodesetId() {
    return deathData.value.DeathSourceConcept
  },
  set CodesetId(value: number | undefined) {
    deathData.value.DeathSourceConcept = value
  },
} as ConceptSetSelection

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.death-editor__type {
  font-weight: 600;
}

.death-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>