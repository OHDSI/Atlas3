<template>
  <div class="event-persistence-selector">
    <div class="event-persistence-selector__body">
      <!-- The redundant "Event Persistence" h3 was removed — the
           parent section already says "Cohort Exit · Strategy: …"
           which covers this. -->

      <!-- Strategy-specific help text — quiet inline hint, not a
           full-width tonal alert. -->
      <div class="event-persistence__hint">
        <AtlasIcon
          icon="mdi-information-outline"
          size="16"
          class="event-persistence__hint-icon"
        />
        <span>{{ strategyHelpText }}</span>
      </div>

      <!-- Conditional Fields for Fixed Duration -->
      <div
        v-if="selectedStrategy === 'FIXED_DURATION'"
        class="strategy-fields"
      >
        <AtlasRow>
          <AtlasCol cols="6">
            <AtlasSelect
              v-model="fixedDurationDateField"
              :items="dateFieldOptions"
              :label="
                t('components.dateOffsetStrategy.dateOffsetStrategyText_3', 'Date Field').value
              "
              :disabled="disabled"
              variant="outlined"
            />
          </AtlasCol>
          <AtlasCol cols="6">
            <AtlasTextField
              v-model.number="fixedDurationOffset"
              type="number"
              :label="
                t('components.dateOffsetStrategy.dateOffsetStrategyText_4', 'Offset (days)').value
              "
              :disabled="disabled"
              :rules="[nonNegativeRule]"
              variant="outlined"
            />
          </AtlasCol>
        </AtlasRow>
      </div>

      <!-- Conditional Fields for Drug Exposure -->
      <div
        v-if="selectedStrategy === 'CONTINUOUS_DRUG'"
        class="strategy-fields"
      >
        <!-- Concept Set Selection Button/Chip -->
        <div class="mb-4">
          <AtlasButton
            v-if="!selectedConceptSet"
            variant="secondary"
            icon="mdi-plus"
            :disabled="disabled"
            @click="openConceptSetDialog"
          >
            {{ t('components.customEraStrategy.selectDrugConceptSet', 'Select Drug Concept Set') }}
          </AtlasButton>
          <AtlasChip
            v-else
            :closable="!disabled"
            tone="primary"
            @close="clearConceptSet"
          >
            {{ selectedConceptSet.name }}
          </AtlasChip>
        </div>

        <!-- Persistence Window and Surveillance Window -->
        <AtlasRow v-if="selectedConceptSet">
          <AtlasCol cols="6">
            <AtlasTextField
              v-model.number="persistenceWindow"
              type="number"
              :label="
                t(
                  'components.customEraStrategy.customEraStrategyText_4',
                  'Persistence Window (days)'
                ).value
              "
              :disabled="disabled"
              :rules="[nonNegativeRule]"
              variant="outlined"
            >
              <template #append-inner>
                <AtlasTooltip location="top">
                  <template #activator="{ props: tooltipProps }">
                    <AtlasIcon
                      v-bind="tooltipProps"
                      icon="mdi-information-outline"
                      size="small"
                      class="text-medium-emphasis"
                    />
                  </template>
                  <span>{{
                    t(
                      'components.customEraStrategy.customEraStrategyText_5',
                      'Maximum gap days between exposures'
                    )
                  }}</span>
                </AtlasTooltip>
              </template>
            </AtlasTextField>
          </AtlasCol>
          <AtlasCol cols="6">
            <AtlasTextField
              v-model.number="surveillanceWindow"
              type="number"
              :label="
                t(
                  'components.customEraStrategy.customEraStrategyText_6',
                  'Surveillance Window (days)'
                ).value
              "
              :disabled="disabled"
              :rules="[nonNegativeRule]"
              variant="outlined"
            >
              <template #append-inner>
                <AtlasTooltip location="top">
                  <template #activator="{ props: tooltipProps }">
                    <AtlasIcon
                      v-bind="tooltipProps"
                      icon="mdi-information-outline"
                      size="small"
                      class="text-medium-emphasis"
                    />
                  </template>
                  <span>{{
                    t(
                      'components.customEraStrategy.customEraStrategyText_7',
                      'Additional days after final exposure before cohort exit'
                    )
                  }}</span>
                </AtlasTooltip>
              </template>
            </AtlasTextField>
          </AtlasCol>
        </AtlasRow>

        <!-- Help text about missing days supply -->
        <div
          v-if="selectedConceptSet"
          class="event-persistence__hint event-persistence__hint--mt"
        >
          <AtlasIcon
            icon="mdi-information-outline"
            size="16"
            class="event-persistence__hint-icon"
          />
          <span>{{
            t(
              'exitCriteria.help.missingDaysSupply',
              'If days supply is missing, system assumes 1 day per exposure'
            ).value
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasChip, AtlasCol, AtlasIcon, AtlasRow, AtlasSelect, AtlasTextField, AtlasTooltip } from '@/components/ui'
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useEventPersistence } from '@/composables/useEventPersistence'
import type { ExitCriteria, ExitStrategy, ConceptSetReference } from '@/models/cohort.types'
import type { ValidationError } from '@/models/validation.types'

const { t, tv } = useI18n()

interface Props {
  modelValue: ExitCriteria
  conceptSets: ConceptSetReference[]
  disabled?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: ExitCriteria]
  'validation-error': [errors: ValidationError[]]
  'select-drug-concept-set': []
}>()

// Use the event persistence composable
const { state, toExitCriteria } = useEventPersistence(props.modelValue)

// Local state for UI binding
const selectedStrategy = ref<ExitStrategy>(state.strategy)
const fixedDurationDateField = ref(state.fixedDuration.dateField)
const fixedDurationOffset = ref(state.fixedDuration.offset)
const drugConceptSetId = ref(state.drugExposure.conceptSetId)
const persistenceWindow = ref(state.drugExposure.persistenceWindow)
const surveillanceWindow = ref(state.drugExposure.surveillanceWindow)

// Date field options
const dateFieldOptions = [
  { value: 'START_DATE', title: tv('columns.startDate', 'Start Date') },
  { value: 'END_DATE', title: tv('columns.endDate', 'End Date') },
]

// Selected concept set for drug exposure
const selectedConceptSet = computed(() => {
  if (!drugConceptSetId.value) return null
  return props.conceptSets.find(cs => cs.id.toString() === drugConceptSetId.value)
})

// Strategy-specific help text
const strategyHelpText = computed(() => {
  switch (selectedStrategy.value) {
    case 'CONTINUOUS_OBSERVATION':
      return tv(
        'options.endOfContinuousObservation',
        'Event persists until observation period ends'
      )
    case 'FIXED_DURATION':
      return tv(
        'components.dateOffsetStrategy.dateOffsetStrategyText_2',
        'Event persists for a specified number of days from start or end date'
      )
    case 'CONTINUOUS_DRUG':
      return tv(
        'components.customEraStrategy.customEraStrategyText_2',
        'Event persists based on continuous drug exposure with allowable gaps between exposures'
      )
    default:
      return ''
  }
})

// Validation rules
const nonNegativeRule = (value: number) => {
  if (value < 0) {
    return tv('exitCriteria.validation.offsetNonNegative', 'Offset values must be non-negative')
  }
  return true
}

// Open concept set selection dialog for drug exposure
function openConceptSetDialog() {
  emit('select-drug-concept-set')
}

// Clear selected concept set
function clearConceptSet() {
  drugConceptSetId.value = null
  emitUpdate()
}

// Emit updated value
function emitUpdate() {
  // Update state values
  state.strategy = selectedStrategy.value
  state.fixedDuration.dateField = fixedDurationDateField.value
  state.fixedDuration.offset = fixedDurationOffset.value
  state.drugExposure.conceptSetId = drugConceptSetId.value
  state.drugExposure.persistenceWindow = persistenceWindow.value
  state.drugExposure.surveillanceWindow = surveillanceWindow.value

  // Convert to ExitCriteria
  const exitCriteria = toExitCriteria(props.conceptSets)
  emit('update:modelValue', exitCriteria)

  // Validate and emit errors
  validateFields()
}

// Validate fields based on strategy
function validateFields() {
  const errors: ValidationError[] = []

  if (selectedStrategy.value === 'FIXED_DURATION') {
    if (fixedDurationOffset.value === undefined) {
      errors.push({
        field: 'exitCriteria.offset',
        message: tv(
          'exitCriteria.validation.offsetRequired',
          'Offset is required for fixed duration strategy'
        ),
        severity: 'error',
      })
    }
  }

  if (selectedStrategy.value === 'CONTINUOUS_DRUG') {
    if (!drugConceptSetId.value) {
      errors.push({
        field: 'exitCriteria.conceptSet',
        message: tv(
          'exitCriteria.validation.conceptSetRequired',
          'Drug concept set required for this strategy'
        ),
        severity: 'warning',
      })
    }
  }

  emit('validation-error', errors)
}

// Flag to prevent circular updates during prop sync
let _syncingFromProps = false

// Watch for changes and emit updates (but skip if we're syncing from props)
watch(
  [
    selectedStrategy,
    fixedDurationDateField,
    fixedDurationOffset,
    drugConceptSetId,
    persistenceWindow,
    surveillanceWindow,
  ],
  () => {
    if (!_syncingFromProps) {
      emitUpdate()
    }
  }
)

// Watch for external changes - only sync when strategy actually changes to prevent infinite loop
// This prevents the bidirectional watcher loop that was causing "Maximum recursive updates exceeded"
watch(
  () => props.modelValue.strategy,
  (newStrategy, oldStrategy) => {
    if (newStrategy !== oldStrategy) {
      _syncingFromProps = true
      selectedStrategy.value = newStrategy

      // Sync strategy-specific fields
      if (newStrategy === 'FIXED_DURATION') {
        fixedDurationDateField.value = props.modelValue.dateField || 'START_DATE'
        fixedDurationOffset.value = props.modelValue.offset || 0
      } else if (newStrategy === 'CONTINUOUS_DRUG') {
        drugConceptSetId.value = props.modelValue.conceptSet?.id.toString() || null
        persistenceWindow.value = props.modelValue.persistenceWindow || 30
        surveillanceWindow.value = props.modelValue.surveillanceWindow || 7
      }

      _syncingFromProps = false
    }
  }
)
</script>

<style scoped>
.event-persistence-selector {
  margin: 0;
}

.event-persistence-selector__body {
  padding: 12px 16px;
}

.strategy-selector {
  display: flex;
  justify-content: center;
}

.strategy-fields {
  margin-top: 16px;
}

/* Quiet inline hint pattern — matches the data-sources hint
 * (no full-width tonal alert). */
.event-persistence__hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
}

.event-persistence__hint--mt {
  margin-top: 8px;
  margin-bottom: 0;
}

.event-persistence__hint-icon {
  color: rgb(var(--v-theme-primary));
  opacity: 0.7;
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
