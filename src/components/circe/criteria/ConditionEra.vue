<template>
  <v-card
    class="condition-era-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="condition-era-editor__header d-flex align-center ga-3 py-3">
      <div class="condition-era-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="condition-era-editor__type">
          {{ eraTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="conditionEraConceptSetModel"
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
            class="condition-era-editor__add-attribute-button"
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
import type { ConditionEra, ConceptArray, Criteria, CriteriaGroup, DateAdjustment, DateRange, NumericRange, ConceptSetSelection } from '@/models/circe-types'
import EventConceptSet from '../input/EventConceptSet.vue'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createDefaultCriteriaGroup, createConceptSetModel, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
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

const eraTitle = computed(() => t('components.conditionEra.title').value)
const addAttributeLabel = computed(() => t('components.criteria.addAttribute').value)
const selectConceptSetLabel = computed(() =>
  t('components.conceptAddBox.selectConceptSet').value
)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: t('criteriaAttributes.first.label').value,
    description: t('criteriaAttributes.first.description').value,
    init: () => {
      conditionEraData.value.First = true
    },
    clear: () => {
      delete conditionEraData.value.First
    },
    isActive: () => conditionEraData.value.First === true,
  },
  {
    key: 'AgeAtStart',
    label: t('criteriaAttributes.ageAtStart.label').value,
    description: t('criteriaAttributes.ageAtStart.description').value,
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(conditionEraData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(conditionEraData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete conditionEraData.value.AgeAtStart
    },
    isActive: () => conditionEraData.value.AgeAtStart != null,
  },
  {
    key: 'AgeAtEnd',
    label: t('criteriaAttributes.ageAtEnd.label').value,
    description: t('criteriaAttributes.ageAtEnd.description').value,
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(conditionEraData.value, 'AgeAtEnd', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(conditionEraData.value, 'AgeAtEnd', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete conditionEraData.value.AgeAtEnd
    },
    isActive: () => conditionEraData.value.AgeAtEnd != null,
  },
  {
    key: 'Gender',
    label: t('criteriaAttributes.gender.label').value,
    description: t('criteriaAttributes.gender.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(conditionEraData.value, 'Gender') as ConceptArrayBinding['concepts'],
      } satisfies ConceptArrayBinding,
      domainFilter: 'Gender',
    }),
    init: () => {
      conditionEraData.value.Gender = [] as ConceptArray
    },
    clear: () => {
      delete conditionEraData.value.Gender
    },
    isActive: () => conditionEraData.value.Gender != null,
  },
  {
    key: 'GenderCS',
    label: t('criteriaAttributes.genderCS.label').value,
    description: t('criteriaAttributes.genderCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(conditionEraData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(conditionEraData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete conditionEraData.value.GenderCS
    },
    isActive: () => conditionEraData.value.GenderCS != null,
  },
  {
    key: 'EraStartDate',
    label: t('criteriaAttributes.eraStartDate.label').value,
    description: t('criteriaAttributes.eraStartDate.description').value,
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(conditionEraData.value, 'EraStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(conditionEraData.value, 'EraStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete conditionEraData.value.EraStartDate
    },
    isActive: () => conditionEraData.value.EraStartDate != null,
  },
  {
    key: 'EraEndDate',
    label: t('criteriaAttributes.eraEndDate.label').value,
    description: t('criteriaAttributes.eraEndDate.description').value,
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(conditionEraData.value, 'EraEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(conditionEraData.value, 'EraEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete conditionEraData.value.EraEndDate
    },
    isActive: () => conditionEraData.value.EraEndDate != null,
  },
  {
    key: 'DateAdjustment',
    label: t('criteriaAttributes.dateAdjustment.label').value,
    description: t('criteriaAttributes.dateAdjustment.description').value,
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(conditionEraData.value, 'DateAdjustment', createDefaultDateAdjustment) as DateAdjustment
    ),
    init: () => {
      ensureObjectField(conditionEraData.value, 'DateAdjustment', createDefaultDateAdjustment)
    },
    clear: () => {
      delete conditionEraData.value.DateAdjustment
    },
    isActive: () => conditionEraData.value.DateAdjustment != null,
  },
  {
    key: 'OccurrenceCount',
    label: t('criteriaAttributes.occurrenceCount.label').value,
    description: t('criteriaAttributes.occurrenceCount.description').value,
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(conditionEraData.value, 'OccurrenceCount', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(conditionEraData.value, 'OccurrenceCount', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete conditionEraData.value.OccurrenceCount
    },
    isActive: () => conditionEraData.value.OccurrenceCount != null,
  },
  {
    key: 'EraLength',
    label: t('criteriaAttributes.eraLength.label').value,
    description: t('criteriaAttributes.eraLength.description').value,
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(conditionEraData.value, 'EraLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(conditionEraData.value, 'EraLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete conditionEraData.value.EraLength
    },
    isActive: () => conditionEraData.value.EraLength != null,
  },
  {
    key: 'CorrelatedCriteria',
    label: t('criteriaAttributes.correlatedCriteria.label').value,
    description: t('criteriaAttributes.correlatedCriteria.description').value,
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(conditionEraData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(conditionEraData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup)
    },
    clear: () => {
      delete conditionEraData.value.CorrelatedCriteria
    },
    isActive: () => conditionEraData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))

const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))

const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const conditionEraData = computed<ConditionEra>(() => {
  const criteria = props.criteria as { ConditionEra?: ConditionEra }
  if (!criteria.ConditionEra) {
    criteria.ConditionEra = {} as ConditionEra
  }
  return criteria.ConditionEra
})

const conditionEra = () => conditionEraData.value

const conditionEraConceptSetModel = createConceptSetModel(conditionEra, 'CodesetId') as ConceptSetSelection

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.condition-era-editor__type {
  font-weight: 600;
}

.condition-era-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>