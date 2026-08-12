<template>
  <v-card
    class="criteria-group-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="criteria-group-editor__body d-flex">
      <AtlasMenu
        v-model="showMatchTypeMenu"
        :close-on-content-click="false"
        location="end"
      >
        <template #activator="{ props: menuProps }">
          <div
            class="vertical-label-container"
            v-bind="menuProps"
          >
            <div
              class="vertical-label match-type-label"
              :data-type="groupType"
              :title="matchTypeChangeLabel"
            >
              {{ groupTypeLabel }}
            </div>
          </div>
        </template>

        <v-card class="match-type-menu">
          <v-card-text class="pa-3">
            <div class="segmented-buttons">
              <AtlasButton
                :variant="groupType === 'ALL' ? 'tonal' : 'secondary'"
                class="flex-1 match-chip--all"
                size="sm"
                @click="groupType = 'ALL'"
              >
                {{ t('options.all', 'All').value }}
              </AtlasButton>
              <AtlasButton
                :variant="groupType === 'ANY' ? 'tonal' : 'secondary'"
                class="flex-1 match-chip--any"
                size="sm"
                @click="groupType = 'ANY'"
              >
                {{ t('options.any', 'Any').value }}
              </AtlasButton>
              <AtlasButton
                :variant="groupType === 'AT_LEAST' ? 'tonal' : 'secondary'"
                class="flex-1 match-chip--at_least"
                size="sm"
                @click="groupType = 'AT_LEAST'"
              >
                {{ t('options.atLeast', 'At least').value }}
              </AtlasButton>
              <AtlasButton
                :variant="groupType === 'AT_MOST' ? 'tonal' : 'secondary'"
                class="flex-1 match-chip--at_most"
                size="sm"
                @click="groupType = 'AT_MOST'"
              >
                {{ t('options.atMost', 'At most').value }}
              </AtlasButton>
            </div>

            <AtlasTextField
              v-if="groupType === 'AT_LEAST' || groupType === 'AT_MOST'"
              v-model="groupCount"
              class="mt-3"
              density="compact"
              hide-details
              :label="groupCountLabel"
              min="1"
              type="number"
            />
          </v-card-text>
        </v-card>
      </AtlasMenu>

      <div class="flex-grow-1 criteria-group-editor__content">
        <div class="group-header d-flex align-center ga-3 mb-3">
          <AtlasMenu>
            <template #activator="{ props: menuProps }">
              <AtlasButton
                v-bind="menuProps"
                variant="outlined"
                size="small"
                prepend-icon="mdi-plus"
              >
                {{ addCriteriaLabel }}
              </AtlasButton>
            </template>

            <AtlasList density="compact">
              <AtlasListItem
                v-for="criteriaType in criteriaTypeOptions"
                :key="criteriaType.value"
                :title="criteriaType.title"
                @click="onAddCriteria(criteriaType.value)"
              />
            </AtlasList>
          </AtlasMenu>

          <AtlasButton
            variant="secondary"
            size="sm"
            prepend-icon="mdi-folder-plus"
            @click="addNestedGroup"
          >
            {{ addGroupLabel }}
          </AtlasButton>

          <AtlasSpacer />

          <AtlasButton
            icon="mdi-delete"
            variant="ghost"
            color="error"
            size="sm"
            @click="emit('remove')"
          />
        </div>

        <AtlasAlert
          v-if="depth > 10"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          {{ deepNestingLabel }} ({{ depth }})
        </AtlasAlert>

        <div v-if="demographicCriteriaList.length > 0">
          <DemographicCriteria
            v-for="(criteriaItem, index) in demographicCriteriaList"
            :key="`demographic-criteria-${index}`"
            :criteria="criteriaItem"
            :concept-sets="conceptSets"
            class="mb-3"
            @remove="removeDemographicCriteria(index)"
            @select-concept-set="emit('select-concept-set', $event)"
            @edit-concept-set="emit('edit-concept-set', $event)"
            @clear-concept-set="emit('clear-concept-set')"
          />
        </div>

        <div v-if="criteriaList.length > 0">
          <CorelatedCriteria
            v-for="(criteriaItem, index) in criteriaList"
            :key="`criteria-${index}`"
            :criteria="criteriaItem"
            :concept-sets="conceptSets"
            class="mb-3"
            @remove="removeCriteria(index)"
            @select-concept-set="emit('select-concept-set', $event)"
            @edit-concept-set="emit('edit-concept-set', $event)"
            @clear-concept-set="emit('clear-concept-set')"
          />
        </div>

        <AtlasAlert
          v-if="demographicCriteriaList.length === 0 && criteriaList.length === 0"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          {{ noCriteriaLabel }}
        </AtlasAlert>

        <div v-if="nestedGroups.length > 0">
          <CriteriaGroup
            v-for="(nestedGroup, index) in nestedGroups"
            :key="`group-${index}`"
            :group="nestedGroup"
            :concept-sets="conceptSets"
            class="mb-3"
            :depth="depth + 1"
            @remove="removeNestedGroup(index)"
            @select-concept-set="emit('select-concept-set', $event)"
            @edit-concept-set="emit('edit-concept-set', $event)"
            @clear-concept-set="emit('clear-concept-set')"
          />
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import {
  AtlasAlert,
  AtlasButton,
  AtlasList,
  AtlasListItem,
  AtlasMenu,
  AtlasSpacer,
  AtlasTextField,
} from '@/components/ui'
import type { CriteriaGroup, CorelatedCriteria as CorelatedCriteriaType, DemographicCriteria as DemographicCriteriaType } from '../circe.types'
import type { ConceptSetOption, ConceptSetSelectionTarget } from './criteria-editor.types'
import { createDefaultWindow } from './window-utils'
import CorelatedCriteria from './CorelatedCriteria.vue'
import DemographicCriteria from './DemographicCriteria.vue'

type CriteriaType = 'DemographicCriteria' | 'ConditionOccurrence' | 'ConditionEra' | 'DrugExposure' | 'DeviceExposure' | 'Death' | 'DoseEra' | 'DrugEra' | 'Measurement' | 'Observation' | 'ObservationPeriod' | 'PayerPlanPeriod' | 'ProcedureOccurrence' | 'Specimen' | 'VisitDetail' | 'VisitOccurrence'

defineOptions({ name: 'CriteriaGroup' })

const props = defineProps<{
  group: CriteriaGroup
  conceptSets: ConceptSetOption[]
  depth?: number
}>()

const emit = defineEmits<{
  remove: []
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

const { t } = useI18n()

const depth = computed(() => props.depth ?? 0)
const showMatchTypeMenu = ref(false)

const groupType = computed({
  get: () => props.group.Type ?? 'ALL',
  set: value => {
    props.group.Type = value
  },
})

const groupCount = computed({
  get: () => props.group.Count?.toString() ?? '',
  set: value => {
    if (value === '' || value === null || value === undefined) {
      delete props.group.Count
      return
    }

    props.group.Count = Number(value)
  },
})

const groupTypeLabel = computed(() => {
  switch (groupType.value) {
    case 'ANY':
      return t('options.any', 'Any').value
    case 'AT_LEAST': {
      const n = props.group.Count ?? '?'
      return `${t('options.atLeast', 'At least').value} ${n}`
    }
    case 'AT_MOST': {
      const n = props.group.Count ?? '?'
      return `${t('options.atMost', 'At most').value} ${n}`
    }
    case 'ALL':
    default:
      return t('options.all', 'All').value
  }
})

const matchTypeChangeLabel = computed(() => t('components.criteriaGroup.clickToChangeMatchType', 'Click to change group match type').value)
const groupCountLabel = computed(() => t('columns.count', 'Count').value)
const addCriteriaLabel = computed(() => t('components.criteriaGroup.addCriteria', 'Add Criteria').value)
const addGroupLabel = computed(() => t('components.criteriaGroup.addNestedGroup', 'Add Group').value)
const deepNestingLabel = computed(() => t('components.criteriaGroup.nestedCriteria.depthWarning', 'Deep nesting detected').value)
const noCriteriaLabel = computed(() => t('components.criteriaGroup.noEventsInGroup', 'No correlated criteria in this group yet.').value)
const demographicCriteriaLabel = computed(() => 'Demographic Criteria')
const criteriaTypeOptions = computed<Array<{ title: string; value: CriteriaType }>>(() => [
  { title: demographicCriteriaLabel.value, value: 'DemographicCriteria' },
  { title: t('criteria.conditionOccurrence.name', 'Condition Occurrence').value, value: 'ConditionOccurrence' },
  { title: t('criteria.conditionEra.name', 'Condition Era').value, value: 'ConditionEra' },
  { title: t('criteria.drugExposure.name', 'Drug Exposure').value, value: 'DrugExposure' },
  { title: t('criteria.drugEra.name', 'Drug Era').value, value: 'DrugEra' },
  { title: t('criteria.doseEra.name', 'Dose Era').value, value: 'DoseEra' },
  { title: t('criteria.measurement.name', 'Measurement').value, value: 'Measurement' },
  { title: t('criteria.observation.name', 'Observation').value, value: 'Observation' },
  { title: t('criteria.observationPeriod.name', 'Observation Period').value, value: 'ObservationPeriod' },
  { title: t('criteria.payerPlanPeriod.name', 'Payer Plan Period').value, value: 'PayerPlanPeriod' },
  { title: t('criteria.procedureOccurrence.name', 'Procedure Occurrence').value, value: 'ProcedureOccurrence' },
  { title: t('criteria.specimen.name', 'Specimen').value, value: 'Specimen' },
  { title: t('criteria.visitDetail.name', 'Visit Detail').value, value: 'VisitDetail' },
  { title: t('criteria.visitOccurrence.name', 'Visit Occurrence').value, value: 'VisitOccurrence' },
  { title: t('criteria.deviceExposure.name', 'Device Exposure').value, value: 'DeviceExposure' },
  { title: t('criteria.death.name', 'Death').value, value: 'Death' },
])

const demographicCriteriaList = computed(() => ensureDemographicCriteriaList())
const criteriaList = computed(() => ensureCriteriaList())
const nestedGroups = computed(() => ensureNestedGroups())

function ensureCriteriaList() {
  if (!props.group.CriteriaList) {
    props.group.CriteriaList = []
  }
  return props.group.CriteriaList
}

function ensureNestedGroups() {
  if (!props.group.Groups) {
    props.group.Groups = []
  }
  return props.group.Groups
}

function ensureDemographicCriteriaList() {
  if (!props.group.DemographicCriteriaList) {
    props.group.DemographicCriteriaList = []
  }
  return props.group.DemographicCriteriaList
}

function createDefaultDemographicCriteria(): DemographicCriteriaType {
  return {}
}

function addDemographicCriteria() {
  ensureDemographicCriteriaList().push(createDefaultDemographicCriteria())
}

function createDefaultCorelatedCriteria(): CorelatedCriteriaType {
  return {
    Criteria: { ConditionOccurrence: {} },
    Occurrence: {
      Type: 2,
      Count: 1,
    },
    StartWindow: createDefaultWindow(),
    RestrictVisit: false,
    IgnoreObservationPeriod: false,
  }
}

function addCriteria(type: CriteriaType) {
  if (type === 'DemographicCriteria') {
    addDemographicCriteria()
    return
  }

  const criteria = createDefaultCorelatedCriteria()
  criteria.Criteria = {
    [type]: {},
  } as CorelatedCriteriaType['Criteria']
  ensureCriteriaList().push(criteria)
}

function onAddCriteria(type: CriteriaType) {
  addCriteria(type)
}

function addNestedGroup() {
  ensureNestedGroups().push({
    Type: 'ALL',
    CriteriaList: [],
    Groups: [],
  })
}

function removeCriteria(index: number) {
  ensureCriteriaList().splice(index, 1)
}

function removeDemographicCriteria(index: number) {
  ensureDemographicCriteriaList().splice(index, 1)
}

function removeNestedGroup(index: number) {
  ensureNestedGroups().splice(index, 1)
}
</script>

<style scoped>
.criteria-group-editor {
  margin-bottom: 16px;
}

.criteria-group-editor__body {
  align-items: stretch;
}

.criteria-group-editor__content {
  padding-left: 12px;
}

.group-header {
  min-height: 40px;
}

.vertical-label-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  margin-left: -16px;
  margin-top: -16px;
  margin-bottom: -16px;
  width: 30px;
  position: relative;
  border-radius: 0 0 0 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.vertical-label {
  writing-mode: sideways-lr;
  text-orientation: sideways;
  font-weight: 700;
  user-select: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  padding-left: 8px;
  position: relative;
  z-index: 1;
  cursor: pointer;
  width: 100%;
  text-align: center;
}

.match-type-label {
  font-size: 14px;
}

.vertical-label-container:has(.match-type-label[data-type='ALL']) {
  border: 1px solid #1f425a;
}

.vertical-label-container:has(.match-type-label[data-type='ALL'])::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #1f425a;
  border-radius: 0 0 0 6px;
}

.match-type-label[data-type='ALL'] {
  color: #1f425a;
}

.vertical-label-container:has(.match-type-label[data-type='ANY']) {
  border: 1px solid #eb6622;
}

.vertical-label-container:has(.match-type-label[data-type='ANY'])::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #eb6622;
  border-radius: 0 0 0 6px;
}

.match-type-label[data-type='ANY'] {
  color: #eb6622;
}

.vertical-label-container:has(.match-type-label[data-type='AT_LEAST']) {
  border: 1px solid #69aed5;
}

.vertical-label-container:has(.match-type-label[data-type='AT_LEAST'])::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #69aed5;
  border-radius: 0 0 0 6px;
}

.match-type-label[data-type='AT_LEAST'] {
  color: #69aed5;
}

.vertical-label-container:has(.match-type-label[data-type='AT_MOST']) {
  border: 1px solid #336b91;
}

.vertical-label-container:has(.match-type-label[data-type='AT_MOST'])::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #336b91;
  border-radius: 0 0 0 6px;
}

.match-type-label[data-type='AT_MOST'] {
  color: #336b91;
}

.segmented-buttons {
  display: flex;
  gap: 4px;
}

.flex-1 {
  flex: 1;
}

.match-type-menu {
  min-width: 350px;
}

.match-chip--all.v-btn--variant-tonal {
  color: #1f425a !important;
}

.match-chip--any.v-btn--variant-tonal {
  color: #eb6622 !important;
}

.match-chip--at_least.v-btn--variant-tonal {
  color: #4a90ba !important;
}

.match-chip--at_most.v-btn--variant-tonal {
  color: #336b91 !important;
}

.criteria-group-editor__title {
  font-weight: 600;
}
</style>