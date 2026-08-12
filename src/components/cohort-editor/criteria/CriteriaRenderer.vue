<template>
  <component
    :is="editorComponent"
    v-if="editorComponent"
    v-bind="editorProps"
    @remove="$emit('remove')"
    @select-concept-set="$emit('select-concept-set', $event)"
    @edit-concept-set="$emit('edit-concept-set', $event)"
    @clear-concept-set="$emit('clear-concept-set')"
  />

  <v-card
    v-else
    class="criteria-renderer__placeholder"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="d-flex align-center ga-3 py-3">
      <div>
        <div class="text-subtitle-2">
          {{ wrapperKey }}
        </div>
        <div class="text-caption">
          Editor not implemented yet.
        </div>
      </div>

      <AtlasSpacer />

      <AtlasButton
        icon="mdi-delete"
        variant="ghost"
        color="error"
        size="sm"
        @click="$emit('remove')"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasButton, AtlasSpacer } from '@/components/ui'
import { getCriteriaWrapperKey, type Criteria, type CriteriaWrapperKey } from '../circe.types'
import ConditionEra from './ConditionEra.vue'
import ConditionOccurrence from './ConditionOccurrence.vue'
import Death from './Death.vue'
import DeviceExposure from './DeviceExposure.vue'
import DoseEra from './DoseEra.vue'
import DrugEra from './DrugEra.vue'
import DrugExposure from './DrugExposure.vue'
import Measurement from './Measurement.vue'
import Observation from './Observation.vue'
import ObservationPeriod from './ObservationPeriod.vue'
import PayerPlanPeriod from './PayerPlanPeriod.vue'
import ProcedureOccurrence from './ProcedureOccurrence.vue'
import Specimen from './Specimen.vue'
import VisitDetail from './VisitDetail.vue'
import VisitOccurrence from './VisitOccurrence.vue'
import type { ConceptSetOption, ConceptSetSelectionTarget } from './criteria-editor.types'

const props = defineProps<{
  criteria: Criteria
  conceptSets: ConceptSetOption[]
}>()

defineEmits<{
  remove: []
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

const wrapperKey = computed(() => getCriteriaWrapperKey(props.criteria))

const editorMap: Partial<Record<CriteriaWrapperKey, unknown>> = {
  ConditionEra: ConditionEra,
  ConditionOccurrence: ConditionOccurrence,
  Death: Death,
  DeviceExposure: DeviceExposure,
  DoseEra: DoseEra,
  DrugEra: DrugEra,
  DrugExposure: DrugExposure,
  Measurement: Measurement,
  Observation: Observation,
  ObservationPeriod: ObservationPeriod,
  PayerPlanPeriod: PayerPlanPeriod,
  ProcedureOccurrence: ProcedureOccurrence,
  Specimen: Specimen,
  VisitDetail: VisitDetail,
  VisitOccurrence: VisitOccurrence,
}

const editorComponent = computed(() => editorMap[wrapperKey.value])

const editorProps = computed(() => {
  return {
    criteria: props.criteria,
    conceptSets: props.conceptSets,
  }
})
</script>

<style scoped>
.criteria-renderer__placeholder {
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.24);
}
</style>
