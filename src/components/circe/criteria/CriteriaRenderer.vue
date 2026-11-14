<template>
  <!-- Inserted from a reusable by reference: read-only until updated or detached. -->
  <div
    v-if="reference && editorComponent"
    class="criteria-renderer__reference"
    data-testid="criteria-reference"
  >
    <ReusableRefBanner
      :reference="reference"
      kind="criteria"
      @update="onUpdateReference"
      @detach="detachCriteria(props.criteria)"
      @remove="$emit('remove')"
    />
    <div
      inert
      class="criteria-renderer__readonly"
    >
      <component
        :is="editorComponent"
        v-bind="editorProps"
      />
    </div>
  </div>

  <component
    :is="editorComponent"
    v-else-if="editorComponent"
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
          {{ tv('components.criteria.editorNotImplemented') }}
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
import { useI18n } from '@/composables/useI18n'
import { getCriteriaWrapperKey, type Criteria } from '@/models/circe-types'
import ConditionEra from './ConditionEra.vue'
import ConditionOccurrence from './ConditionOccurrence.vue'
import CustomEra from './CustomEra.vue'
import Episode from './Episode.vue'
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
import type { EditableCriteriaKey } from './criteria-registry'
import ReusableRefBanner from '@/components/reusables/ReusableRefBanner.vue'
import {
  detachCriteria,
  getCriteriaReference,
  updateReferencedCriteria,
  type ReusableInstance,
} from '@/components/reusables/reusable-design'

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

const { tv } = useI18n()

const wrapperKey = computed(() => getCriteriaWrapperKey(props.criteria))

const reference = computed(() => getCriteriaReference(props.criteria))

function onUpdateReference(instance: ReusableInstance) {
  updateReferencedCriteria(props.criteria, instance)
}

// The one place components are bound to criteria types. Every key the registry
// marks `hasEditor` must appear here, and the check below fails the build if one
// does not — which is how LocationRegion used to go missing from list after list
// without anything noticing.
const editorMap = {
  ConditionEra: ConditionEra,
  ConditionOccurrence: ConditionOccurrence,
  CustomEra: CustomEra,
  Death: Death,
  DeviceExposure: DeviceExposure,
  DoseEra: DoseEra,
  DrugEra: DrugEra,
  DrugExposure: DrugExposure,
  Episode: Episode,
  Measurement: Measurement,
  Observation: Observation,
  ObservationPeriod: ObservationPeriod,
  PayerPlanPeriod: PayerPlanPeriod,
  ProcedureOccurrence: ProcedureOccurrence,
  Specimen: Specimen,
  VisitDetail: VisitDetail,
  VisitOccurrence: VisitOccurrence,
} satisfies Record<EditableCriteriaKey, unknown>

const editorComponent = computed(
  () => editorMap[wrapperKey.value as EditableCriteriaKey] as unknown
)

const editorProps = computed(() => {
  return {
    criteria: props.criteria,
    conceptSets: props.conceptSets,
  }
})
</script>

<style scoped>
/* The editor is inert inside a reference; hide its controls rather than
   show them as if they worked. */
.criteria-renderer__readonly :deep(.v-btn) {
  visibility: hidden;
}

.criteria-renderer__placeholder {
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.24);
}
</style>
