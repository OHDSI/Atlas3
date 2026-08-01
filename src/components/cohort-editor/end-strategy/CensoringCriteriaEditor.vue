<template>
  <div class="censoring-criteria-editor">
    <div class="censoring-criteria-editor__heading">
      <span class="censoring-criteria-editor__eyebrow">Censoring Events</span>
      <span class="censoring-criteria-editor__heading-rule" />
    </div>
    <p class="censoring-criteria-editor__lede">
      Cohort members exit early when any of these events occur.
    </p>

    <div class="mt-3">
      <v-menu location="bottom start">
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            variant="outlined"
            size="small"
            prepend-icon="mdi-plus"
          >
            Add Censoring Event
          </v-btn>
        </template>

        <v-list density="compact">
          <v-list-item
            v-for="type in criteriaTypes"
            :key="type"
            :title="type"
            @click="addCriteria(type)"
          />
        </v-list>
      </v-menu>
    </div>

    <div
      v-if="modelValue.length > 0"
      class="censoring-criteria-editor__list mt-3"
    >
      <div
        v-for="(criteria, index) in modelValue"
        :key="index"
        class="censoring-criteria-editor__item mb-2"
      >
        <CriteriaRenderer
          :criteria="criteria"
          :concept-sets="conceptSets"
          @remove="removeCriteria(index)"
          @select-concept-set="emit('select-concept-set', $event)"
          @edit-concept-set="emit('edit-concept-set', $event)"
          @clear-concept-set="emit('clear-concept-set')"
        />
      </div>
    </div>

    <div
      v-else
      class="censoring-criteria-editor__empty mt-3"
    >
      <v-icon
        size="16"
        class="censoring-criteria-editor__empty-icon"
      >
        mdi-information-outline
      </v-icon>
      <span>No censoring events defined. Cohort exit is determined only by the end strategy above.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Criteria } from '../circe.types'
import type { ConceptSetOption, ConceptSetSelectionTarget } from '../criteria/criteria-editor.types'
import CriteriaRenderer from '../criteria/CriteriaRenderer.vue'

const props = defineProps<{
  modelValue: Criteria[]
  conceptSets: ConceptSetOption[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Criteria[]]
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

const criteriaTypes = [
  'ConditionOccurrence',
  'ConditionEra',
  'DrugExposure',
  'DoseEra',
  'DeviceExposure',
  'DrugEra',
  'Measurement',
  'Observation',
  'ObservationPeriod',
  'PayerPlanPeriod',
  'ProcedureOccurrence',
  'Specimen',
  'VisitDetail',
  'VisitOccurrence',
  'Death',
]

const criteriaFactories: Record<string, () => Criteria> = {
  ConditionOccurrence: () => ({ ConditionOccurrence: { First: false } }),
  ConditionEra: () => ({ ConditionEra: {} }),
  DrugExposure: () => ({ DrugExposure: {} }),
  DoseEra: () => ({ DoseEra: {} }),
  DeviceExposure: () => ({ DeviceExposure: {} }),
  DrugEra: () => ({ DrugEra: {} }),
  Measurement: () => ({ Measurement: {} }),
  Observation: () => ({ Observation: {} }),
  ObservationPeriod: () => ({ ObservationPeriod: {} }),
  PayerPlanPeriod: () => ({ PayerPlanPeriod: {} }),
  ProcedureOccurrence: () => ({ ProcedureOccurrence: {} }),
  Specimen: () => ({ Specimen: {} }),
  VisitDetail: () => ({ VisitDetail: {} }),
  VisitOccurrence: () => ({ VisitOccurrence: {} }),
  Death: () => ({ Death: {} }),
}

function addCriteria(type: string) {
  const factory = criteriaFactories[type]
  if (!factory) return
  emit('update:modelValue', [...props.modelValue, factory()])
}

function removeCriteria(index: number) {
  const updated = [...props.modelValue]
  updated.splice(index, 1)
  emit('update:modelValue', updated)
}
</script>

<style scoped>
.censoring-criteria-editor__heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.censoring-criteria-editor__eyebrow {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--v-theme-primary));
  white-space: nowrap;
}

.censoring-criteria-editor__heading-rule {
  flex: 1;
  height: 1px;
  background: rgb(var(--v-theme-outline-variant));
}

.censoring-criteria-editor__lede {
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
  margin: 0;
}

.censoring-criteria-editor__empty {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
}

.censoring-criteria-editor__empty-icon {
  color: rgb(var(--v-theme-primary));
  opacity: 0.7;
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
