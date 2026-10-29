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
    </div>

    <AtlasChip
      v-if="!showTrimOptions"
      class="trim-toggle mt-3"
      color="primary"
      variant="outlined"
      :disabled="disabled"
      style="cursor: pointer"
      @click="!disabled && (showTrimOptions = true)"
    >
      {{ addTrimmingLabel }}
    </AtlasChip>

    <div
      v-if="showTrimOptions"
      class="trim-options mt-2"
    >
      <div class="trim-body">
        <div class="trim-rows">
          <div class="trim-row">
            <span class="trim-row__label">{{ leftCensorLabel }}</span>
            <AtlasTextField
              :model-value="startDateModel ?? undefined"
              type="date"
              variant="outlined"
              hide-details
              class="trim-row__input"
              :placeholder="noCensoringLabel"
              :disabled="disabled"
              :aria-label="leftCensorLabel"
              @update:model-value="(v) => { startDateModel = (v as string) || null; emitCensorWindow() }"
            />
          </div>
          <div class="trim-row">
            <span class="trim-row__label">{{ rightCensorLabel }}</span>
            <AtlasTextField
              :model-value="endDateModel ?? undefined"
              type="date"
              variant="outlined"
              hide-details
              class="trim-row__input"
              :placeholder="noCensoringLabel"
              :disabled="disabled"
              :aria-label="rightCensorLabel"
              @update:model-value="(v) => { endDateModel = (v as string) || null; emitCensorWindow() }"
            />
          </div>
        </div>
        <AtlasIconButton
          icon="mdi-close"
          tone="danger"
          variant="text"
          size="sm"
          class="trim-clear"
          :disabled="disabled"
          :aria-label="clearTrimmingLabel"
          @click="clearTrimming"
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { AtlasAlert, AtlasChip, AtlasIconButton, AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { Period, CollapseSettings } from '@/models/circe-types'
import type { ValidationError } from '@/models/validation.types'

const { t } = useI18n()

interface Props {
  censorWindow?: Period | null
  collapseSettings?: CollapseSettings | null
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  censorWindow: null,
  collapseSettings: null,
  disabled: false,
})

const emit = defineEmits<{
  'update:censorWindow': [value: Period | undefined]
  'update:collapseSettings': [value: CollapseSettings]
  'validation-error': [errors: ValidationError[]]
}>()

const eraGapLabel = computed(
  () =>
    t('components.cohortExpressionEditor.eraCollapseGap').value
)
const daysLabel = computed(() => t('components.cohortExpressionEditor.days').value)
const addTrimmingLabel = computed(
  () => t('components.cohortExpressionEditor.addTrimmingOptions').value
)
const leftCensorLabel = computed(
  () =>
    t('components.cohortExpressionEditor.leftCensorStartDates')
      .value
)
const rightCensorLabel = computed(
  () =>
    t('components.cohortExpressionEditor.rightCensorEndDates')
      .value
)
const noCensoringLabel = computed(
  () => t('components.cohortExpressionEditor.noCensoring').value
)
const clearTrimmingLabel = computed(
  () => t('components.cohortExpressionEditor.clearTrimmingDate').value
)

const eraPadModel = ref<number>(props.collapseSettings?.EraPad ?? 0)
const startDateModel = ref<string | null>(props.censorWindow?.StartDate ?? null)
const endDateModel = ref<string | null>(props.censorWindow?.EndDate ?? null)
const showTrimOptions = ref<boolean>(
  Boolean(props.censorWindow?.StartDate || props.censorWindow?.EndDate)
)

watch(
  () => props.collapseSettings,
  value => {
    eraPadModel.value = value?.EraPad ?? 0
  },
  { deep: true }
)

watch(
  () => props.censorWindow,
  value => {
    startDateModel.value = value?.StartDate ?? null
    endDateModel.value = value?.EndDate ?? null
    if (value?.StartDate || value?.EndDate) {
      showTrimOptions.value = true
    }
  },
  { deep: true }
)

const dateOrderWarning = computed(() => {
  if (startDateModel.value && endDateModel.value && startDateModel.value > endDateModel.value) {
    return t('censorWindow.validation.startAfterEnd').value
  }
  return ''
})

function emitCollapseSettings() {
  const eraPad =
    Number.isFinite(eraPadModel.value) && eraPadModel.value >= 0 ? Math.floor(eraPadModel.value) : 0
  eraPadModel.value = eraPad
  emit('update:collapseSettings', {
    CollapseType: props.collapseSettings?.CollapseType ?? 'ERA',
    EraPad: eraPad,
  })
}

function emitCensorWindow() {
  const start = startDateModel.value ?? undefined
  const end = endDateModel.value ?? undefined
  if (!start && !end) {
    emit('update:censorWindow', undefined)
    emit('validation-error', [])
    return
  }
  emit('update:censorWindow', { StartDate: start, EndDate: end })
  if (dateOrderWarning.value) {
    emit('validation-error', [
      {
        field: 'censorWindow.EndDate',
        message: dateOrderWarning.value,
        severity: 'warning',
      },
    ])
  } else {
    emit('validation-error', [])
  }
}

function clearTrimming() {
  startDateModel.value = null
  endDateModel.value = null
  emitCensorWindow()
  showTrimOptions.value = false
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

.trim-body {
  display: flex;
  align-items: center;
  gap: 8px;
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
