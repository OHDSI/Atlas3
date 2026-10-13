<template>
  <v-card
    class="observation-period-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="observation-period-editor__header d-flex align-center ga-3 py-3">
      <div class="observation-period-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="observation-period-editor__type">
          {{ observationPeriodTitle }}
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
            class="observation-period-editor__add-attribute-button"
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
import type { ConceptSetOption, ConceptSetSelectionTarget, CriteriaAttributeSpec, ConceptArrayBinding } from './criteria-editor.types'
import type { ConceptArray, Criteria, CriteriaGroup, ConceptSetSelection, DateAdjustment, DateRange, NumericRange, ObservationPeriod, Period } from '@/models/circe-types'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createDefaultCriteriaGroup, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'

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
const observationPeriodTitle = computed(() => t('components.observationPeriod.title').value)
const addAttributeLabel = computed(() => t('components.criteria.addAttribute').value)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: t('components.observationPeriod.attributes.first.label').value,
    description: t('components.observationPeriod.attributes.first.description').value,
    init: () => {
      observationPeriodData.value.First = true
    },
    clear: () => {
      delete observationPeriodData.value.First
    },
    isActive: () => observationPeriodData.value.First === true,
  },
  {
    key: 'PeriodStartDate',
    label: t('criteriaAttributes.periodStartDate.label').value,
    description: t('criteriaAttributes.periodStartDate.description').value,
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationPeriodData.value, 'PeriodStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'PeriodStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete observationPeriodData.value.PeriodStartDate
    },
    isActive: () => observationPeriodData.value.PeriodStartDate != null,
  },
  {
    key: 'PeriodEndDate',
    label: t('criteriaAttributes.periodEndDate.label').value,
    description: t('criteriaAttributes.periodEndDate.description').value,
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationPeriodData.value, 'PeriodEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'PeriodEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete observationPeriodData.value.PeriodEndDate
    },
    isActive: () => observationPeriodData.value.PeriodEndDate != null,
  },
  {
    key: 'UserDefinedPeriod',
    label: t('criteriaAttributes.userDefinedPeriod.label').value,
    description: t('criteriaAttributes.userDefinedPeriod.description').value,
    kind: 'period',
    componentProps: () => ({
      modelValue: ensureObjectField(observationPeriodData.value, 'UserDefinedPeriod', () => ({ StartDate: '', EndDate: '' })) as Period,
    }),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'UserDefinedPeriod', () => ({ StartDate: '', EndDate: '' }))
    },
    clear: () => {
      delete observationPeriodData.value.UserDefinedPeriod
    },
    isActive: () => observationPeriodData.value.UserDefinedPeriod != null,
  },
  {
    key: 'PeriodType',
    label: t('criteriaAttributes.periodType.label').value,
    description: t('criteriaAttributes.periodType.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationPeriodData.value, 'PeriodType'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      observationPeriodData.value.PeriodType = [] as ConceptArray
    },
    clear: () => {
      delete observationPeriodData.value.PeriodType
    },
    isActive: () => observationPeriodData.value.PeriodType != null,
  },
  {
    key: 'PeriodTypeCS',
    label: t('criteriaAttributes.periodTypeCS.label').value,
    description: t('criteriaAttributes.periodTypeCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(observationPeriodData.value, 'PeriodTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      'Select Concept Set',
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'PeriodTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete observationPeriodData.value.PeriodTypeCS
    },
    isActive: () => observationPeriodData.value.PeriodTypeCS != null,
  },
  {
    key: 'PeriodLength',
    label: t('criteriaAttributes.periodLength.label').value,
    description: t('criteriaAttributes.periodLength.description').value,
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationPeriodData.value, 'PeriodLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'PeriodLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete observationPeriodData.value.PeriodLength
    },
    isActive: () => observationPeriodData.value.PeriodLength != null,
  },
  {
    key: 'DateAdjustment',
    label: t('criteriaAttributes.dateAdjustment.label').value,
    description: t('criteriaAttributes.dateAdjustment.description').value,
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationPeriodData.value, 'DateAdjustment', createDefaultDateAdjustment) as DateAdjustment
    ),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'DateAdjustment', createDefaultDateAdjustment)
    },
    clear: () => {
      delete observationPeriodData.value.DateAdjustment
    },
    isActive: () => observationPeriodData.value.DateAdjustment != null,
  },
  {
    key: 'AgeAtStart',
    label: t('criteriaAttributes.ageAtStart.label').value,
    description: t('components.observationPeriod.attributes.ageAtStart.description').value,
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationPeriodData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete observationPeriodData.value.AgeAtStart
    },
    isActive: () => observationPeriodData.value.AgeAtStart != null,
  },
  {
    key: 'AgeAtEnd',
    label: t('criteriaAttributes.ageAtEnd.label').value,
    description: t('components.observationPeriod.attributes.ageAtEnd.description').value,
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationPeriodData.value, 'AgeAtEnd', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'AgeAtEnd', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete observationPeriodData.value.AgeAtEnd
    },
    isActive: () => observationPeriodData.value.AgeAtEnd != null,
  },
  {
    key: 'CorrelatedCriteria',
    label: t('criteriaAttributes.correlatedCriteria.label').value,
    description: t('criteriaAttributes.correlatedCriteria.description').value,
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(observationPeriodData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup)
    },
    clear: () => {
      delete observationPeriodData.value.CorrelatedCriteria
    },
    isActive: () => observationPeriodData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const observationPeriodData = computed<ObservationPeriod>(() => {
  const criteria = props.criteria as { ObservationPeriod?: ObservationPeriod }
  if (!criteria.ObservationPeriod) {
    criteria.ObservationPeriod = {} as ObservationPeriod
  }
  return criteria.ObservationPeriod
})

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.observation-period-editor__type {
  font-weight: 600;
}

.observation-period-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>