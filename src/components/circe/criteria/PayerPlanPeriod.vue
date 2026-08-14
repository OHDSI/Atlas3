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
import type { ConceptArray, Criteria, CriteriaGroup, ConceptSetSelection, DateAdjustment, DateRange, NumericRange, PayerPlanPeriod, Period } from '@/models/circe-types'
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
    isActive: () => payerPlanPeriodData.value.PeriodStartDate != null,
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
    isActive: () => payerPlanPeriodData.value.PeriodEndDate != null,
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
    isActive: () => payerPlanPeriodData.value.UserDefinedPeriod != null,
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
    isActive: () => payerPlanPeriodData.value.PeriodLength != null,
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
    isActive: () => payerPlanPeriodData.value.AgeAtStart != null,
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
    isActive: () => payerPlanPeriodData.value.AgeAtEnd != null,
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
      payerPlanPeriodData.value.Gender = [] as ConceptArray
    },
    clear: () => {
      delete payerPlanPeriodData.value.Gender
    },
    isActive: () => payerPlanPeriodData.value.Gender != null,
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
    isActive: () => payerPlanPeriodData.value.GenderCS != null,
  },
  {
    key: 'PayerConcept',
    label: 'Payer Concept',
    description: 'Filter by payer concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriod, 'PayerConcept') as ConceptSetSelection,
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
    isActive: () => payerPlanPeriodData.value.PayerConcept != null,
  },
  {
    key: 'PlanConcept',
    label: 'Plan Concept',
    description: 'Filter by plan concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriod, 'PlanConcept') as ConceptSetSelection,
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
    isActive: () => payerPlanPeriodData.value.PlanConcept != null,
  },
  {
    key: 'SponsorConcept',
    label: 'Sponsor Concept',
    description: 'Filter by sponsor concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriod, 'SponsorConcept') as ConceptSetSelection,
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
    isActive: () => payerPlanPeriodData.value.SponsorConcept != null,
  },
  {
    key: 'StopReasonConcept',
    label: 'Stop Reason Concept',
    description: 'Filter by stop reason concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriod, 'StopReasonConcept') as ConceptSetSelection,
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
    isActive: () => payerPlanPeriodData.value.StopReasonConcept != null,
  },
  {
    key: 'PayerSourceConcept',
    label: 'Payer Source Concept',
    description: 'Filter by payer source concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriod, 'PayerSourceConcept') as ConceptSetSelection,
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
    isActive: () => payerPlanPeriodData.value.PayerSourceConcept != null,
  },
  {
    key: 'PlanSourceConcept',
    label: 'Plan Source Concept',
    description: 'Filter by plan source concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriod, 'PlanSourceConcept') as ConceptSetSelection,
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
    isActive: () => payerPlanPeriodData.value.PlanSourceConcept != null,
  },
  {
    key: 'SponsorSourceConcept',
    label: 'Sponsor Source Concept',
    description: 'Filter by sponsor source concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriod, 'SponsorSourceConcept') as ConceptSetSelection,
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
    isActive: () => payerPlanPeriodData.value.SponsorSourceConcept != null,
  },
  {
    key: 'StopReasonSourceConcept',
    label: 'Stop Reason Source Concept',
    description: 'Filter by stop reason source concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      createConceptSetModel(payerPlanPeriod, 'StopReasonSourceConcept') as ConceptSetSelection,
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
    isActive: () => payerPlanPeriodData.value.StopReasonSourceConcept != null,
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
    isActive: () => payerPlanPeriodData.value.DateAdjustment != null,
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
    isActive: () => payerPlanPeriodData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const payerPlanPeriodData = computed<PayerPlanPeriod>(() => {
  const criteria = props.criteria as { PayerPlanPeriod?: PayerPlanPeriod }
  if (!criteria.PayerPlanPeriod) {
    criteria.PayerPlanPeriod = {} as PayerPlanPeriod
  }
  return criteria.PayerPlanPeriod
})

const payerPlanPeriod = () => payerPlanPeriodData.value

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