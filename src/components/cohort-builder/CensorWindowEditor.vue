<template>
  <div class="censor-window-editor">
    <div class="era-pad-row">
      <span class="era-pad-row__label">{{ eraGapLabel }}</span>
      <AtlasTextField
        v-model.number="eraPadModel"
        type="number"
        min="0"
        variant="outlined"
        hide-details
        class="era-pad-row__input"
        :disabled="disabled"
        :aria-label="eraGapLabel"
        @blur="emitCollapseSettings"
      />
      <span class="era-pad-row__suffix">{{ daysLabel }}</span>
      <button
        v-if="!showTrimOptions"
        type="button"
        class="trim-toggle"
        :disabled="disabled"
        @click="showTrimOptions = true"
      >
        {{ addTrimmingLabel }}
      </button>
    </div>

    <div
      v-if="showTrimOptions"
      class="trim-options mt-2"
    >
      <div class="trim-rows">
        <div class="trim-row">
          <span class="trim-row__label">{{ leftCensorLabel }}</span>
          <v-text-field
            v-model="startDateModel"
            type="date"
            density="compact"
            variant="outlined"
            hide-details
            class="trim-row__input"
            :placeholder="noCensoringLabel"
            :disabled="disabled"
            :aria-label="leftCensorLabel"
            clearable
            @update:model-value="emitCensorWindow"
            @click:clear="clearStartDate"
          />
        </div>
        <div class="trim-row">
          <span class="trim-row__label">{{ rightCensorLabel }}</span>
          <v-text-field
            v-model="endDateModel"
            type="date"
            density="compact"
            variant="outlined"
            hide-details
            class="trim-row__input"
            :placeholder="noCensoringLabel"
            :disabled="disabled"
            :aria-label="rightCensorLabel"
            clearable
            @update:model-value="emitCensorWindow"
            @click:clear="clearEndDate"
          />
        </div>

        <AtlasAlert
          v-if="dateOrderWarning"
          severity="warning"
          density="compact"
          class="mt-2"
        >
          {{ dateOrderWarning }}
        </AtlasAlert>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { AtlasAlert, AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { CensorWindow, CollapseSettings } from '@/models/cohort.types'
import type { ValidationError } from '@/models/validation.types'

const { t } = useI18n()

interface Props {
  censorWindow?: CensorWindow | null
  collapseSettings?: CollapseSettings | null
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  censorWindow: null,
  collapseSettings: null,
  disabled: false,
})

const emit = defineEmits<{
  'update:censorWindow': [value: CensorWindow | undefined]
  'update:collapseSettings': [value: CollapseSettings]
  'validation-error': [errors: ValidationError[]]
}>()

const eraGapLabel = computed(
  () =>
    t('components.cohortExpressionEditor.cohortErasText_1', 'Specify era collapse gap size:').value
)
const daysLabel = computed(() => t('components.cohortExpressionEditor.days', 'days').value)
const addTrimmingLabel = computed(
  () => t('components.cohortExpressionEditor.addTrimmingOptions', 'add trimming options...').value
)
const leftCensorLabel = computed(
  () =>
    t('components.cohortExpressionEditor.cohortErasText_2', 'Left censor cohort start dates to')
      .value
)
const rightCensorLabel = computed(
  () =>
    t('components.cohortExpressionEditor.cohortErasText_3', 'Right censor cohort end dates to')
      .value
)
const noCensoringLabel = computed(
  () => t('components.cohortExpressionEditor.noCensoring', 'No Censoring').value
)

const eraPadModel = ref<number>(props.collapseSettings?.eraPad ?? 0)
const startDateModel = ref<string | null>(props.censorWindow?.startDate ?? null)
const endDateModel = ref<string | null>(props.censorWindow?.endDate ?? null)
const showTrimOptions = ref<boolean>(
  Boolean(props.censorWindow?.startDate || props.censorWindow?.endDate)
)

watch(
  () => props.collapseSettings,
  value => {
    eraPadModel.value = value?.eraPad ?? 0
  },
  { deep: true }
)

watch(
  () => props.censorWindow,
  value => {
    startDateModel.value = value?.startDate ?? null
    endDateModel.value = value?.endDate ?? null
    if (value?.startDate || value?.endDate) {
      showTrimOptions.value = true
    }
  },
  { deep: true }
)

const dateOrderWarning = computed(() => {
  if (startDateModel.value && endDateModel.value && startDateModel.value > endDateModel.value) {
    return t(
      'exitCriteria.validation.startGreaterThanEnd',
      'Start date must be on or before end date'
    ).value
  }
  return ''
})

function emitCollapseSettings() {
  const eraPad =
    Number.isFinite(eraPadModel.value) && eraPadModel.value >= 0 ? Math.floor(eraPadModel.value) : 0
  eraPadModel.value = eraPad
  emit('update:collapseSettings', {
    collapseType: props.collapseSettings?.collapseType ?? 'ERA',
    eraPad,
  })
}

function emitCensorWindow() {
  const start = startDateModel.value || null
  const end = endDateModel.value || null
  if (!start && !end) {
    emit('update:censorWindow', undefined)
    emit('validation-error', [])
    return
  }
  emit('update:censorWindow', { startDate: start, endDate: end })
  if (dateOrderWarning.value) {
    emit('validation-error', [
      {
        field: 'censorWindow.endDate',
        message: dateOrderWarning.value,
        severity: 'warning',
      },
    ])
  } else {
    emit('validation-error', [])
  }
}

function clearStartDate() {
  startDateModel.value = null
  emitCensorWindow()
}

function clearEndDate() {
  endDateModel.value = null
  emitCensorWindow()
}
</script>

<style scoped>
.censor-window-editor {
  margin: 0;
  padding: 0 16px 16px;
}

.era-pad-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.era-pad-row__label {
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
}

.era-pad-row__input {
  max-width: 120px;
}

.era-pad-row__suffix {
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.trim-toggle {
  background: none;
  border: 0;
  padding: 0;
  font-size: 13px;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  text-decoration: underline;
}

.trim-toggle:hover:not(:disabled) {
  color: rgb(var(--v-theme-primary-darken-1));
}

.trim-toggle:disabled {
  opacity: 0.5;
  cursor: default;
}

.trim-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trim-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.trim-row__label {
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
  min-width: 200px;
}

.trim-row__input {
  max-width: 200px;
}
</style>
