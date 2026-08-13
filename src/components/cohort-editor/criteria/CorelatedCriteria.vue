<template>
  <v-card
    class="corelated-criteria-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="corelated-criteria-editor__body d-flex">
      <AtlasMenu
        v-model="showOccurrenceMenu"
        :close-on-content-click="false"
        location="end"
      >
        <template #activator="{ props: menuProps }">
          <div
            class="vertical-label-container"
            v-bind="menuProps"
          >
            <div
              class="vertical-label occurrence-label"
              :data-type="occurrenceTypeKey"
              :title="occurrenceChangeLabel"
            >
              {{ occurrenceLabel }}
            </div>
          </div>
        </template>

        <v-card class="occurrence-menu">
          <v-card-text class="pa-3">
            <div class="segmented-buttons">
              <AtlasButton
                :variant="occurrenceTypeKey === 'EXACTLY' ? 'tonal' : 'secondary'"
                class="flex-1 occurrence-chip--exactly"
                size="sm"
                @click="occurrenceTypeKey = 'EXACTLY'"
              >
                {{ exactLabel }}
              </AtlasButton>
              <AtlasButton
                :variant="occurrenceTypeKey === 'AT_LEAST' ? 'tonal' : 'secondary'"
                class="flex-1 occurrence-chip--at_least"
                size="sm"
                @click="occurrenceTypeKey = 'AT_LEAST'"
              >
                {{ atLeastLabel }}
              </AtlasButton>
              <AtlasButton
                :variant="occurrenceTypeKey === 'AT_MOST' ? 'tonal' : 'secondary'"
                class="flex-1 occurrence-chip--at_most"
                size="sm"
                @click="occurrenceTypeKey = 'AT_MOST'"
              >
                {{ atMostLabel }}
              </AtlasButton>
            </div>

            <AtlasTextField
              v-model="occurrenceCount"
              class="mt-3"
              density="compact"
              hide-details
              :label="countLabel"
              min="0"
              type="number"
            />

            <div class="corelated-criteria-editor__distinct mt-3">
              <AtlasChip
                class="corelated-criteria-editor__distinct-chip"
                :variant="isDistinct ? 'tonal' : 'outlined'"
                :color="isDistinct ? 'success' : 'primary'"
                prepend-icon="mdi-filter-variant"
                @click="toggleDistinct"
              >
                {{ distinctLabel }}
              </AtlasChip>

              <AtlasSelect
                v-if="isDistinct"
                v-model="distinctCountColumn"
                class="mt-3"
                density="compact"
                hide-details
                :items="[...distinctColumnOptions]"
                item-title="label"
                item-value="value"
                :label="distinctByLabel"
                variant="outlined"
              />
            </div>
          </v-card-text>
        </v-card>
      </AtlasMenu>

      <div class="flex-grow-1 corelated-criteria-editor__content">
        <CriteriaRenderer
          :criteria="innerCriteria"
          :concept-sets="conceptSets"
          class="mb-3"
          @remove="emit('remove')"
          @select-concept-set="emit('select-concept-set', $event)"
          @edit-concept-set="emit('edit-concept-set', $event)"
          @clear-concept-set="emit('clear-concept-set')"
        />

        <AtlasMenu
          v-model="showWindowMenu"
          :close-on-content-click="false"
          location="bottom"
          offset="10"
        >
          <template #activator="{ props: menuProps }">
            <div class="corelated-criteria-editor__temporal mt-3">
              <AtlasChip
                class="corelated-criteria-editor__window-chip"
                color="primary"
                prepend-icon="mdi-calendar-range"
                variant="tonal"
                v-bind="menuProps"
              >
                {{ windowSummaryLabel }}
              </AtlasChip>
            </div>
          </template>

          <v-card
            class="corelated-criteria-editor__window-menu"
            rounded="lg"
          >
            <v-card-text class="d-flex flex-column ga-4">
              <AtlasSelect
                :items="windowPresetOptions"
                item-title="label"
                item-value="label"
                :label="quickPresetsLabel"
                variant="outlined"
                density="compact"
                hide-details
                @update:model-value="(value) => applyWindowPresetByLabel(typeof value === 'string' ? value : null)"
              />

              <Window :window="ensureStartWindow()" />

              <template v-if="props.criteria.EndWindow">
                <div class="corelated-criteria-editor__window-separator">
                  {{ t('common.and', 'and').value }}
                </div>

                <Window :window="props.criteria.EndWindow">
                  <template #actions>
                    <AtlasButton
                      icon="mdi-delete"
                      color="error"
                      variant="ghost"
                      size="sm"
                      @click="removeEndWindow"
                    />
                  </template>
                </Window>
              </template>
            </v-card-text>

            <v-card-actions>
              <AtlasButton
                v-if="!props.criteria.EndWindow"
                variant="tonal"
                @click="ensureEndWindow()"
              >
                {{ addTimeBoxLabel }}
              </AtlasButton>

              <AtlasSpacer />

              <AtlasButton
                variant="ghost"
                @click="showWindowMenu = false"
              >
                {{ closeLabel }}
              </AtlasButton>
            </v-card-actions>
          </v-card>
        </AtlasMenu>

        <div class="corelated-criteria-editor__flags mt-3">
          <AtlasChip
            class="mr-2"
            :variant="restrictVisit ? 'tonal' : 'outlined'"
            :color="restrictVisit ? 'success' : 'primary'"
            @click="restrictVisit = !restrictVisit"
          >
            {{ restrictVisitLabel }}
          </AtlasChip>

          <AtlasChip
            :variant="ignoreObservationPeriod ? 'tonal' : 'outlined'"
            :color="ignoreObservationPeriod ? 'success' : 'primary'"
            @click="ignoreObservationPeriod = !ignoreObservationPeriod"
          >
            {{ ignoreObservationLabel }}
          </AtlasChip>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import {
  AtlasButton,
  AtlasChip,
  AtlasMenu,
  AtlasSelect,
  AtlasSpacer,
  AtlasTextField,
} from '@/components/ui'
import CriteriaRenderer from './CriteriaRenderer.vue'
import Window from './Window.vue'
import type { CorelatedCriteria, Criteria, Occurrence } from '../circe.types'
import type { ConceptSetOption, ConceptSetSelectionTarget } from './criteria-editor.types'
import { createDefaultWindow, formatWindowExpression, getWindowPresetOptions, cloneWindow, type WindowPresetValue } from './window-utils'
import { numberBinding } from '../input/bindings'

type OccurrenceTypeOption = Omit<Occurrence, 'Type' | 'Count' | 'IsDistinct'> & {
  Type: NonNullable<Occurrence['Type']>
  Count: NonNullable<Occurrence['Count']>
  IsDistinct: NonNullable<Occurrence['IsDistinct']>
}

defineOptions({ name: 'CorelatedCriteria' })

const props = defineProps<{
  criteria: CorelatedCriteria
  conceptSets: ConceptSetOption[]
}>()

const emit = defineEmits<{
  remove: []
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

const { t } = useI18n()

const showOccurrenceMenu = ref(false)
const showWindowMenu = ref(false)
const windowPresetOptions = getWindowPresetOptions()

const innerCriteria = computed<Criteria>(() => {
  if (!props.criteria.Criteria) {
    props.criteria.Criteria = { ConditionOccurrence: {} }
  }

  return props.criteria.Criteria as Criteria
})

const occurrence = computed<OccurrenceTypeOption>(() => ensureOccurrence())

const occurrenceTypeKey = computed<'EXACTLY' | 'AT_LEAST' | 'AT_MOST'>({
  get: () => occurrenceTypeFromValue(occurrence.value.Type),
  set: value => {
    occurrence.value.Type = occurrenceTypeToValue(value)
  },
})

const occurrenceCount = numberBinding(occurrence, 'Count')

const isDistinct = computed({
  get: () => occurrence.value.IsDistinct ?? false,
  set: value => {
    occurrence.value.IsDistinct = value
  },
})

const distinctCountColumn = computed<Occurrence['CountColumn']>({
  get: () => occurrence.value.CountColumn,
  set: value => {
    if (value === undefined) {
      delete occurrence.value.CountColumn
      return
    }

    occurrence.value.CountColumn = value
  },
})

type DistinctCountColumnOption = {
  label: string
  value: NonNullable<Occurrence['CountColumn']>
}

const occurrenceLabel = computed(() => {
  const labelByType = {
    EXACTLY: t('options.exactly', 'Exactly').value,
    AT_LEAST: t('options.atLeast', 'At least').value,
    AT_MOST: t('options.atMost', 'At most').value,
  }

  if (!isDistinct.value) {
    return `${labelByType[occurrenceTypeKey.value]} ${occurrenceCount.value}`
  }

  return `${labelByType[occurrenceTypeKey.value]} ${occurrenceCount.value} of distinct ${distinctCountColumnLabel.value}`
})

const windowSummaryLabel = computed(() => {
  const startSummary = formatWindowExpression(props.criteria.StartWindow)
  const endSummary = props.criteria.EndWindow ? formatWindowExpression(props.criteria.EndWindow) : ''

  return endSummary ? `${startSummary} ${t('common.and', 'and').value} ${endSummary}` : startSummary
})

const occurrenceChangeLabel = computed(() => t('components.criteriaGroup.nestedCriteria.selectLogicType', 'Select occurrence mode').value)
const countLabel = computed(() => t('columns.count', 'Count').value)
const distinctByLabel = computed(() => 'Distinct by')
const distinctLabel = computed(() => (isDistinct.value ? 'Using distinct events' : 'Using all events'))
const distinctCountColumnLabel = computed(() => {
  switch (distinctCountColumn.value) {
    case 'START_DATE':
      return 'Start Date'
    case 'DOMAIN_CONCEPT':
      return 'Standard Concept'
    case 'VISIT_ID':
      return 'Visit'
    default:
      return 'Standard Concept'
  }
})
const quickPresetsLabel = computed(() => t('common.presets', 'Quick Presets').value)
const addTimeBoxLabel = computed(() => t('components.eventCard.addTemporalWindow', 'Add Temporal Window').value)
const closeLabel = computed(() => t('common.close', 'Close').value)
const restrictVisitLabel = computed(() => t('components.criteriaGroup.criteriaGroupText_1', 'restrict to the same visit occurrence').value)
const ignoreObservationLabel = computed(() => t('components.criteriaGroup.criteriaGroupText_2', 'allow events from outside observation period').value)
const exactLabel = computed(() => t('options.exactly', 'Exactly').value)
const atLeastLabel = computed(() => t('options.atLeast', 'At least').value)
const atMostLabel = computed(() => t('options.atMost', 'At most').value)

const distinctColumnOptions: DistinctCountColumnOption[] = [
  { label: 'Start Date', value: 'START_DATE' },
  { label: 'Standard Concept', value: 'DOMAIN_CONCEPT' },
  { label: 'Visit', value: 'VISIT_ID' },
]

const restrictVisit = computed({
  get: () => props.criteria.RestrictVisit ?? false,
  set: value => {
    props.criteria.RestrictVisit = value
  },
})

const ignoreObservationPeriod = computed({
  get: () => props.criteria.IgnoreObservationPeriod ?? false,
  set: value => {
    props.criteria.IgnoreObservationPeriod = value
  },
})

function ensureOccurrence(): OccurrenceTypeOption {
  if (!props.criteria.Occurrence) {
    props.criteria.Occurrence = {
      Type: 2,
      Count: 1,
      IsDistinct: false,
    }
  }

  return props.criteria.Occurrence as OccurrenceTypeOption
}

function toggleDistinct() {
  isDistinct.value = !isDistinct.value

  if (isDistinct.value && !distinctCountColumn.value) {
    distinctCountColumn.value = 'DOMAIN_CONCEPT'
  }
}

function occurrenceTypeFromValue(value: number | null | undefined): 'EXACTLY' | 'AT_LEAST' | 'AT_MOST' {
  switch (value) {
    case 1:
      return 'AT_MOST'
    case 2:
      return 'AT_LEAST'
    case 0:
    default:
      return 'EXACTLY'
  }
}

function occurrenceTypeToValue(value: 'EXACTLY' | 'AT_LEAST' | 'AT_MOST'): number {
  switch (value) {
    case 'AT_MOST':
      return 1
    case 'AT_LEAST':
      return 2
    case 'EXACTLY':
    default:
      return 0
  }
}

function ensureStartWindow() {
  if (!props.criteria.StartWindow) {
    props.criteria.StartWindow = createDefaultWindow()
  }

  return props.criteria.StartWindow
}

function ensureEndWindow() {
  props.criteria.EndWindow = createDefaultWindow()
}

function removeEndWindow() {
  delete props.criteria.EndWindow
}

function applyWindowPreset(preset: WindowPresetValue | null) {
  if (!preset) {
    return
  }

  props.criteria.StartWindow = cloneWindow(preset.startWindow)

  if (preset.endWindow) {
    props.criteria.EndWindow = cloneWindow(preset.endWindow)
  } else {
    delete props.criteria.EndWindow
  }
}

function applyWindowPresetByLabel(label: unknown) {
  if (typeof label !== 'string' || !label) {
    return
  }

  const preset = windowPresetOptions.find(option => option.label === label)
  if (!preset) {
    return
  }

  applyWindowPreset(preset.value)
}
</script>

<style scoped>
.corelated-criteria-editor {
  margin-bottom: 12px;
}

.corelated-criteria-editor__body {
  align-items: stretch;
}

.corelated-criteria-editor__content {
  padding-left: 12px;
}

.corelated-criteria-editor__temporal {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.corelated-criteria-editor__window-chip {
  max-width: 100%;
  white-space: normal;
  height: auto;
}

.corelated-criteria-editor__window-menu {
  width: fit-content;
  max-width: calc(100vw - 32px);
}

.corelated-criteria-editor__window-separator {
  display: flex;
  justify-content: center;
  font-weight: 700;
  text-transform: lowercase;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.72;
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

.occurrence-label {
  font-size: 13px;
}

.vertical-label-container:has(.occurrence-label[data-type='EXACTLY']) {
  border: 1px solid #1f425a;
}

.vertical-label-container:has(.occurrence-label[data-type='EXACTLY'])::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #1f425a;
  border-radius: 0 0 0 6px;
}

.occurrence-label[data-type='EXACTLY'] {
  color: #1f425a;
}

.vertical-label-container:has(.occurrence-label[data-type='AT_LEAST']) {
  border: 1px solid #69aed5;
}

.vertical-label-container:has(.occurrence-label[data-type='AT_LEAST'])::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #69aed5;
  border-radius: 0 0 0 6px;
}

.occurrence-label[data-type='AT_LEAST'] {
  color: #69aed5;
}

.vertical-label-container:has(.occurrence-label[data-type='AT_MOST']) {
  border: 1px solid #336b91;
}

.vertical-label-container:has(.occurrence-label[data-type='AT_MOST'])::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #336b91;
  border-radius: 0 0 0 6px;
}

.occurrence-label[data-type='AT_MOST'] {
  color: #336b91;
}

.segmented-buttons {
  display: flex;
  gap: 4px;
}

.flex-1 {
  flex: 1;
}

.occurrence-menu {
  min-width: 300px;
}

.occurrence-chip--exactly.v-btn--variant-tonal {
  color: #1f425a !important;
}

.occurrence-chip--at_least.v-btn--variant-tonal {
  color: #4a90ba !important;
}

.occurrence-chip--at_most.v-btn--variant-tonal {
  color: #336b91 !important;
}
</style>