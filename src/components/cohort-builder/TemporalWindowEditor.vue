<script setup lang="ts">
import { AtlasAlert, AtlasCheckbox, AtlasCol, AtlasDivider, AtlasRow, AtlasSelect, AtlasTextField } from '@/components/ui'
import { computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { TemporalWindow, Window } from '@/models/event.types'
import { useTemporalWindows } from '@/composables/useTemporalWindows'

const { t } = useI18n()

const props = defineProps<{
  modelValue?: TemporalWindow
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TemporalWindow]
}>()

const { validateTemporalWindows, defaultWindow, getTemporalWindowPresets } = useTemporalWindows()

// Local state with default values
const temporalWindow = computed<TemporalWindow>({
  get: () =>
    props.modelValue ?? {
      startWindow: defaultWindow('after', 0),
      endWindow: defaultWindow('after', 90),
    },
  set: (value: TemporalWindow) => emit('update:modelValue', value),
})

// Validation
const validation = computed(() => validateTemporalWindows(temporalWindow.value))

// Preset options
const presetOptions = getTemporalWindowPresets()

// Start window handlers
const updateStartDays = (days: number | null) => {
  temporalWindow.value = {
    ...temporalWindow.value,
    startWindow: temporalWindow.value.startWindow
      ? { ...temporalWindow.value.startWindow, days }
      : defaultWindow('after', days ?? 0),
  }
}

const updateStartDirection = (direction: string) => {
  const dir = direction as 'before' | 'after'
  temporalWindow.value = {
    ...temporalWindow.value,
    startWindow: temporalWindow.value.startWindow
      ? { ...temporalWindow.value.startWindow, beforeAfter: dir === 'after' ? 'AFTER' : 'BEFORE' }
      : defaultWindow(dir, 0),
  }
}

const updateStartAllTime = (allTime: boolean | null) => {
  if (allTime === null) return
  temporalWindow.value = {
    ...temporalWindow.value,
    startWindow: temporalWindow.value.startWindow
      ? { ...temporalWindow.value.startWindow, days: allTime ? null : 0 }
      : defaultWindow('after', allTime ? null : 0),
  }
}

const updateStartReferencePoint = (referencePoint: Window['referencePoint']) => {
  temporalWindow.value = {
    ...temporalWindow.value,
    startWindow: temporalWindow.value.startWindow
      ? { ...temporalWindow.value.startWindow, referencePoint }
      : { ...defaultWindow('after', 0), referencePoint },
  }
}

// End window handlers
const updateEndDays = (days: number | null) => {
  temporalWindow.value = {
    ...temporalWindow.value,
    endWindow: temporalWindow.value.endWindow
      ? { ...temporalWindow.value.endWindow, days }
      : defaultWindow('after', days ?? 90),
  }
}

const updateEndDirection = (direction: string) => {
  const dir = direction as 'before' | 'after'
  temporalWindow.value = {
    ...temporalWindow.value,
    endWindow: temporalWindow.value.endWindow
      ? { ...temporalWindow.value.endWindow, beforeAfter: dir === 'after' ? 'AFTER' : 'BEFORE' }
      : defaultWindow(dir, 90),
  }
}

const updateEndAllTime = (allTime: boolean | null) => {
  if (allTime === null) return
  temporalWindow.value = {
    ...temporalWindow.value,
    endWindow: temporalWindow.value.endWindow
      ? { ...temporalWindow.value.endWindow, days: allTime ? null : 90 }
      : defaultWindow('after', allTime ? null : 90),
  }
}

const updateEndReferencePoint = (referencePoint: Window['referencePoint']) => {
  temporalWindow.value = {
    ...temporalWindow.value,
    endWindow: temporalWindow.value.endWindow
      ? { ...temporalWindow.value.endWindow, referencePoint }
      : { ...defaultWindow('after', 90), referencePoint },
  }
}

// Computed helpers
const startDays = computed(() => temporalWindow.value.startWindow?.days ?? 0)
const startDirection = computed(() =>
  temporalWindow.value.startWindow?.beforeAfter === 'AFTER' ? 'after' : 'before'
)
const startAllTime = computed(() => temporalWindow.value.startWindow?.days === null)
const startReferencePoint = computed(
  () => temporalWindow.value.startWindow?.referencePoint ?? 'INDEX_START'
)

const endDays = computed(() => temporalWindow.value.endWindow?.days ?? 90)
const endDirection = computed(() =>
  temporalWindow.value.endWindow?.beforeAfter === 'AFTER' ? 'after' : 'before'
)
const endAllTime = computed(() => temporalWindow.value.endWindow?.days === null)
const endReferencePoint = computed(
  () => temporalWindow.value.endWindow?.referencePoint ?? 'INDEX_START'
)

// Reference point options
const referencePointOptions: Array<{ value: Window['referencePoint']; label: string }> = [
  { value: 'INDEX_START', label: t('options.indexStartDate', 'Index Start').value },
  { value: 'INDEX_END', label: t('options.indexEndDate', 'Index End').value },
  { value: 'EVENT_START', label: t('options.eventStarts', 'Event Start').value },
  { value: 'EVENT_END', label: t('options.eventEnds', 'Event End').value },
]

// Apply preset
const applyPreset = (preset: TemporalWindow) => {
  temporalWindow.value = preset
}

// Initialize with defaults if no value provided
watch(
  () => props.modelValue,
  newValue => {
    if (!newValue) {
      emit('update:modelValue', {
        startWindow: defaultWindow('after', 0),
        endWindow: defaultWindow('after', 90),
      })
    }
  },
  { immediate: true }
)
</script>

<template>
  <v-card
    class="temporal-window-editor"
    elevation="0"
    variant="outlined"
    color="white"
  >
    <v-card-title class="text-subtitle-1">
      {{ t('common.temporalWindows', 'Temporal Windows') }}
    </v-card-title>
    <v-card-text>
      <!-- Presets -->
      <AtlasRow dense>
        <AtlasCol cols="12">
          <AtlasSelect
            :label="t('common.presets', 'Quick Presets').value"
            :items="presetOptions"
            item-title="label"
            item-value="value"
            variant="outlined"
            hide-details
            clearable
            @update:model-value="(v) => v && applyPreset(v as TemporalWindow)"
          />
        </AtlasCol>
      </AtlasRow>

      <AtlasDivider class="my-4" />

      <!-- Start Window -->
      <div class="mb-4">
        <div class="text-subtitle-2 mb-2">
          {{ t('common.startWindow', 'Start Window') }}
        </div>
        <AtlasRow dense>
          <AtlasCol
            cols="12"
            md="4"
          >
            <AtlasTextField
              :model-value="startDays"
              type="number"
              :label="t('common.startDays', 'Start Days').value"
              :aria-label="t('common.startDays', 'Start Days').value"
              variant="outlined"
              min="0"
              :disabled="startAllTime"
              hide-details
              @update:model-value="v => updateStartDays(Number(v))"
            />
          </AtlasCol>
          <AtlasCol
            cols="12"
            md="4"
          >
            <AtlasSelect
              :model-value="startDirection"
              :items="[
                { value: 'before', label: t('options.before', 'Before').value },
                { value: 'after', label: t('options.after', 'After').value },
              ]"
              item-title="label"
              item-value="value"
              :label="t('common.startDirection', 'Start Direction').value"
              :aria-label="t('common.startDirection', 'Start Direction').value"
              variant="outlined"
              hide-details
              @update:model-value="(v) => updateStartDirection(v as string)"
            />
          </AtlasCol>
          <AtlasCol
            cols="12"
            md="4"
          >
            <AtlasCheckbox
              :model-value="startAllTime"
              :label="
                t('components.featureextraction.covariateSettingsEditor.allTime', 'All time').value
              "
              :aria-label="
                t('components.featureextraction.covariateSettingsEditor.allTime', 'All time').value
              "
              hide-details
              @update:model-value="(v) => updateStartAllTime(v)"
            />
          </AtlasCol>
        </AtlasRow>
        <AtlasRow
          dense
          class="mt-2"
        >
          <AtlasCol cols="12">
            <AtlasSelect
              :model-value="startReferencePoint"
              :items="referencePointOptions"
              item-title="label"
              item-value="value"
              label="Reference Point"
              aria-label="Start Reference Point"
              variant="outlined"
              hide-details
              @update:model-value="(v) => updateStartReferencePoint(v as Window['referencePoint'])"
            />
          </AtlasCol>
        </AtlasRow>
      </div>

      <AtlasDivider class="my-4" />

      <!-- End Window -->
      <div>
        <div class="text-subtitle-2 mb-2">
          {{ t('common.endWindow', 'End Window') }}
        </div>
        <AtlasRow dense>
          <AtlasCol
            cols="12"
            md="4"
          >
            <AtlasTextField
              :model-value="endDays"
              type="number"
              :label="
                t('components.featureextraction.covariateSettingsEditor.endDays', 'End Days').value
              "
              :aria-label="
                t('components.featureextraction.covariateSettingsEditor.endDays', 'End Days').value
              "
              variant="outlined"
              min="0"
              :disabled="endAllTime"
              hide-details
              @update:model-value="v => updateEndDays(Number(v))"
            />
          </AtlasCol>
          <AtlasCol
            cols="12"
            md="4"
          >
            <AtlasSelect
              :model-value="endDirection"
              :items="[
                { value: 'before', label: t('options.before', 'Before').value },
                { value: 'after', label: t('options.after', 'After').value },
              ]"
              item-title="label"
              item-value="value"
              :label="t('common.endDirection', 'End Direction').value"
              :aria-label="t('common.endDirection', 'End Direction').value"
              variant="outlined"
              hide-details
              @update:model-value="(v) => updateEndDirection(v as string)"
            />
          </AtlasCol>
          <AtlasCol
            cols="12"
            md="4"
          >
            <AtlasCheckbox
              :model-value="endAllTime"
              :label="
                t('components.featureextraction.covariateSettingsEditor.allTime', 'All time').value
              "
              :aria-label="
                t('components.featureextraction.covariateSettingsEditor.allTime', 'All time').value
              "
              hide-details
              @update:model-value="(v) => updateEndAllTime(v)"
            />
          </AtlasCol>
        </AtlasRow>
        <AtlasRow
          dense
          class="mt-2"
        >
          <AtlasCol cols="12">
            <AtlasSelect
              :model-value="endReferencePoint"
              :items="referencePointOptions"
              item-title="label"
              item-value="value"
              label="Reference Point"
              aria-label="End Reference Point"
              variant="outlined"
              hide-details
              @update:model-value="(v) => updateEndReferencePoint(v as Window['referencePoint'])"
            />
          </AtlasCol>
        </AtlasRow>
      </div>

      <!-- Validation Error Messages -->
      <AtlasRow
        v-if="!validation.isValid"
        dense
      >
        <AtlasCol cols="12">
          <AtlasAlert
            severity="danger"
            density="compact"
            class="mt-2"
          >
            <ul class="pl-4">
              <li
                v-for="error in validation.errors"
                :key="error"
              >
                {{ error }}
              </li>
            </ul>
          </AtlasAlert>
        </AtlasCol>
      </AtlasRow>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.temporal-window-editor {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background-color: white;
}

.temporal-window-editor :deep(.v-card-title),
.temporal-window-editor :deep(.v-card-text) {
  color: rgba(0, 0, 0, 0.87);
}
</style>
