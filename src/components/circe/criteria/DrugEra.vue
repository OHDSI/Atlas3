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
import { useI18n } from '@/composables/useI18n'
import {
  AtlasButton,
  AtlasDivider,
  AtlasList,
  AtlasListItem,
  AtlasMenu,
  AtlasSpacer,
} from '@/components/ui'
import type { ConceptArray, Criteria, CriteriaGroup, DateRange, DrugEra, NumericRange, ConceptSetSelection } from '@/models/circe-types'
import EventConceptSet from '../input/EventConceptSet.vue'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createDefaultCriteriaGroup, createConceptSetModel, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
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

const { t } = useI18n()
const eraTitle = computed(() => t('components.drugEra.title').value)
const addAttributeLabel = computed(() => t('components.criteria.addAttribute').value)
const selectConceptSetLabel = computed(() => t('components.criteria.selectConceptSet').value)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: t('components.drugEra.attributes.first.label').value,
    description: t('components.drugEra.attributes.first.description').value,
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
    label: t('criteriaAttributes.ageAtStart.label').value,
    description: t('criteriaAttributes.ageAtStart.description').value,
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
    label: t('criteriaAttributes.ageAtEnd.label').value,
    description: t('criteriaAttributes.ageAtEnd.description').value,
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
    label: t('criteriaAttributes.gender.label').value,
    description: t('criteriaAttributes.gender.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(drugEraData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      drugEraData.value.Gender = [] as ConceptArray
    },
    clear: () => {
      delete drugEraData.value.Gender
    },
    isActive: () => drugEraData.value.Gender != null,
  },
  {
    key: 'GenderCS',
    label: t('criteriaAttributes.genderCS.label').value,
    description: t('criteriaAttributes.genderCS.description').value,
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
    label: t('criteriaAttributes.eraStartDate.label').value,
    description: t('criteriaAttributes.eraStartDate.description').value,
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
    label: t('criteriaAttributes.eraEndDate.label').value,
    description: t('criteriaAttributes.eraEndDate.description').value,
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
    label: t('components.drugEra.attributes.occurrenceCount.label').value,
    description: t('components.drugEra.attributes.occurrenceCount.description').value,
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
    label: t('criteriaAttributes.gapDays.label').value,
    description: t('criteriaAttributes.gapDays.description').value,
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
    label: t('criteriaAttributes.eraLength.label').value,
    description: t('criteriaAttributes.eraLength.description').value,
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
    label: t('criteriaAttributes.correlatedCriteria.label').value,
    description: t('criteriaAttributes.correlatedCriteria.description').value,
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(drugEraData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(drugEraData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup)
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

const drugEraData = computed<DrugEra>(() => {
  const criteria = props.criteria as { DrugEra?: DrugEra }
  if (!criteria.DrugEra) {
    criteria.DrugEra = {} as DrugEra
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