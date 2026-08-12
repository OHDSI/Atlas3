<template>
  <v-card
    class="payer-plan-period-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="payer-plan-period-editor__header d-flex align-center ga-3 py-3">
      <div class="payer-plan-period-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="payer-plan-period-editor__type">
          {{ payerPlanPeriodTitle }}
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
            class="payer-plan-period-editor__add-attribute-button"
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
import type { Criteria, CriteriaGroup, ConceptSetSelection, DateAdjustment, DateRange, NumericRange, Period } from '../circe.types'
import type { ConceptArrayBinding, ConceptSetOption, ConceptSetSelectionTarget, CriteriaAttributeSpec } from './criteria-editor.types'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createConceptSetModel, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'

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

const payerPlanPeriodTitle = computed(() => 'a payer plan period of')
const addAttributeLabel = computed(() => 'Add attribute...')
const selectConceptSetLabel = computed(() => t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: 'First Payer Plan Period',
    description: 'Limit to first payer plan period in history',
    init: () => {
      payerPlanPeriodData.value.First = true
    },
    clear: () => {
      delete payerPlanPeriodData.value.First
    },
    isActive: () => payerPlanPeriodData.value.First === true,
  },
  {
    key: 'PeriodStartDate',
    label: 'Period Start Date',
    description: 'Filter by period start date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(payerPlanPeriodData.value, 'PeriodStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(payerPlanPeriodData.value, 'PeriodStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete payerPlanPeriodData.value.PeriodStartDate
    },
    isActive: () => 'PeriodStartDate' in payerPlanPeriodData.value,
  },
  {
    key: 'PeriodEndDate',
    label: 'Period End Date',
    description: 'Filter by period end date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(payerPlanPeriodData.value, 'PeriodEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(payerPlanPeriodData.value, 'PeriodEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete payerPlanPeriodData.value.PeriodEndDate
    },
    isActive: () => 'PeriodEndDate' in payerPlanPeriodData.value,
  },
  {
    key: 'UserDefinedPeriod',
    label: 'User Defined Period',
    description: 'Set the user-defined period range',
    kind: 'period',
    componentProps: () => ({
      modelValue: ensureObjectField(payerPlanPeriodData.value, 'UserDefinedPeriod', () => ({ StartDate: '', EndDate: '' })) as Period,
    }),
    init: () => {
      ensureObjectField(payerPlanPeriodData.value, 'UserDefinedPeriod', () => ({ StartDate: '', EndDate: '' }))
    },
    clear: () => {
      delete payerPlanPeriodData.value.UserDefinedPeriod
    },
    isActive: () => 'UserDefinedPeriod' in payerPlanPeriodData.value,
  },
  {
    key: 'PeriodLength',
    label: 'Period Length',
    description: 'Filter by period length',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(payerPlanPeriodData.value, 'PeriodLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(payerPlanPeriodData.value, 'PeriodLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete payerPlanPeriodData.value.PeriodLength
    },
    isActive: () => 'PeriodLength' in payerPlanPeriodData.value,
  },
  {
    key: 'AgeAtStart',
    label: 'Age at Start',
    description: 'Filter by age at start of period',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(payerPlanPeriodData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(payerPlanPeriodData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete payerPlanPeriodData.value.AgeAtStart
    },
    isActive: () => 'AgeAtStart' in payerPlanPeriodData.value,
  },
  {
    key: 'AgeAtEnd',
    label: 'Age at End',
    description: 'Filter by age at end of period',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(payerPlanPeriodData.value, 'AgeAtEnd', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(payerPlanPeriodData.value, 'AgeAtEnd', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete payerPlanPeriodData.value.AgeAtEnd
    },
    isActive: () => 'AgeAtEnd' in payerPlanPeriodData.value,
  },
  {
    key: 'Gender',
    label: 'Gender',
    description: 'Filter by patient gender',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(payerPlanPeriodData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      payerPlanPeriodData.value.Gender = []
    },
    clear: () => {
      delete payerPlanPeriodData.value.Gender
    },
    isActive: () => 'Gender' in payerPlanPeriodData.value,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(payerPlanPeriodData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(payerPlanPeriodData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete payerPlanPeriodData.value.GenderCS
    },
    isActive: () => 'GenderCS' in payerPlanPeriodData.value,
  },
  {
    key: 'PayerConcept',
    label: 'Payer Concept',
    description: 'Filter by payer concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriodData.value, 'PayerConcept') as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      payerPlanPeriodData.value.PayerConcept = undefined
    },
    clear: () => {
      delete payerPlanPeriodData.value.PayerConcept
    },
    isActive: () => 'PayerConcept' in payerPlanPeriodData.value,
  },
  {
    key: 'PlanConcept',
    label: 'Plan Concept',
    description: 'Filter by plan concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriodData.value, 'PlanConcept') as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      payerPlanPeriodData.value.PlanConcept = undefined
    },
    clear: () => {
      delete payerPlanPeriodData.value.PlanConcept
    },
    isActive: () => 'PlanConcept' in payerPlanPeriodData.value,
  },
  {
    key: 'SponsorConcept',
    label: 'Sponsor Concept',
    description: 'Filter by sponsor concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriodData.value, 'SponsorConcept') as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      payerPlanPeriodData.value.SponsorConcept = undefined
    },
    clear: () => {
      delete payerPlanPeriodData.value.SponsorConcept
    },
    isActive: () => 'SponsorConcept' in payerPlanPeriodData.value,
  },
  {
    key: 'StopReasonConcept',
    label: 'Stop Reason Concept',
    description: 'Filter by stop reason concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriodData.value, 'StopReasonConcept') as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      payerPlanPeriodData.value.StopReasonConcept = undefined
    },
    clear: () => {
      delete payerPlanPeriodData.value.StopReasonConcept
    },
    isActive: () => 'StopReasonConcept' in payerPlanPeriodData.value,
  },
  {
    key: 'PayerSourceConcept',
    label: 'Payer Source Concept',
    description: 'Filter by payer source concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriodData.value, 'PayerSourceConcept') as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      payerPlanPeriodData.value.PayerSourceConcept = undefined
    },
    clear: () => {
      delete payerPlanPeriodData.value.PayerSourceConcept
    },
    isActive: () => 'PayerSourceConcept' in payerPlanPeriodData.value,
  },
  {
    key: 'PlanSourceConcept',
    label: 'Plan Source Concept',
    description: 'Filter by plan source concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriodData.value, 'PlanSourceConcept') as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      payerPlanPeriodData.value.PlanSourceConcept = undefined
    },
    clear: () => {
      delete payerPlanPeriodData.value.PlanSourceConcept
    },
    isActive: () => 'PlanSourceConcept' in payerPlanPeriodData.value,
  },
  {
    key: 'SponsorSourceConcept',
    label: 'Sponsor Source Concept',
    description: 'Filter by sponsor source concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriodData.value, 'SponsorSourceConcept') as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      payerPlanPeriodData.value.SponsorSourceConcept = undefined
    },
    clear: () => {
      delete payerPlanPeriodData.value.SponsorSourceConcept
    },
    isActive: () => 'SponsorSourceConcept' in payerPlanPeriodData.value,
  },
  {
    key: 'StopReasonSourceConcept',
    label: 'Stop Reason Source Concept',
    description: 'Filter by stop reason source concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriodData.value, 'StopReasonSourceConcept') as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      payerPlanPeriodData.value.StopReasonSourceConcept = undefined
    },
    clear: () => {
      delete payerPlanPeriodData.value.StopReasonSourceConcept
    },
    isActive: () => 'StopReasonSourceConcept' in payerPlanPeriodData.value,
  },
  {
    key: 'DateAdjustment',
    label: 'Date Adjustment',
    description: 'Adjust event dates',
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(payerPlanPeriodData.value, 'DateAdjustment', createDefaultDateAdjustment) as DateAdjustment
    ),
    init: () => {
      ensureObjectField(payerPlanPeriodData.value, 'DateAdjustment', createDefaultDateAdjustment)
    },
    clear: () => {
      delete payerPlanPeriodData.value.DateAdjustment
    },
    isActive: () => 'DateAdjustment' in payerPlanPeriodData.value,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Add nested criteria group',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(payerPlanPeriodData.value, 'CorrelatedCriteria', () => ({})) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(payerPlanPeriodData.value, 'CorrelatedCriteria', () => ({}))
    },
    clear: () => {
      delete payerPlanPeriodData.value.CorrelatedCriteria
    },
    isActive: () => 'CorrelatedCriteria' in payerPlanPeriodData.value,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const payerPlanPeriodData = computed<Record<string, any>>(() => {
  const criteria = props.criteria as Record<string, any>
  if (!criteria.PayerPlanPeriod) {
    criteria.PayerPlanPeriod = {}
  }
  return criteria.PayerPlanPeriod
})

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.payer-plan-period-editor__type {
  font-weight: 600;
}

.payer-plan-period-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>