<template>
  <div class="pathway-settings">
    <div class="pathway-settings__row">
      <label class="pathway-settings__label">{{ t('pathway.combinationWindow', 'Collapse window (days)') }}</label>
      <v-select
        :model-value="modelValue.combinationWindow as (typeof combinationWindowOptions)[number]"
        :items="combinationWindowOptions"
        density="compact"
        variant="plain"
        hide-details
        :readonly="readonly"
        class="pathway-settings__control"
        @update:model-value="(v: number | null) => v !== null && update('combinationWindow', v)"
      />
    </div>
    <div class="pathway-settings__row">
      <label class="pathway-settings__label">{{ t('pathway.minCellCount', 'Minimum cell count') }}</label>
      <v-select
        :model-value="modelValue.minCellCount as (typeof minCellCountOptions)[number]"
        :items="minCellCountOptions"
        density="compact"
        variant="plain"
        hide-details
        :readonly="readonly"
        class="pathway-settings__control"
        @update:model-value="(v: number | null) => v !== null && update('minCellCount', v)"
      />
    </div>
    <div class="pathway-settings__row">
      <label class="pathway-settings__label">{{ t('pathway.maxDepth', 'Maximum path length') }}</label>
      <v-select
        :model-value="modelValue.maxDepth as (typeof maxDepthOptions)[number]"
        :items="maxDepthOptions"
        density="compact"
        variant="plain"
        hide-details
        :readonly="readonly"
        class="pathway-settings__control"
        @update:model-value="(v: number | null) => v !== null && update('maxDepth', v)"
      />
    </div>
    <div class="pathway-settings__row">
      <label class="pathway-settings__label">{{ t('pathway.allowRepeats', 'Allow repeats') }}</label>
      <v-switch
        :model-value="modelValue.allowRepeats"
        density="compact"
        hide-details
        inset
        :readonly="readonly"
        class="pathway-settings__control pathway-settings__switch"
        @update:model-value="(v: boolean | null) => v !== null && update('allowRepeats', v)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { PathwayDesign } from '@/models/pathway.types'
import {
  COMBINATION_WINDOW_OPTIONS,
  MIN_CELL_COUNT_OPTIONS,
  MAX_DEPTH_OPTIONS,
} from '@/models/pathway.types'

const props = defineProps<{
  modelValue: PathwayDesign
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [v: PathwayDesign]
}>()

const { t } = useI18n()

const combinationWindowOptions = [...COMBINATION_WINDOW_OPTIONS]
const minCellCountOptions = [...MIN_CELL_COUNT_OPTIONS]
const maxDepthOptions = [...MAX_DEPTH_OPTIONS]

function update<K extends keyof PathwayDesign>(key: K, value: PathwayDesign[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<style scoped>
.pathway-settings {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pathway-settings__row {
  display: grid;
  grid-template-columns: 1fr 90px;
  align-items: center;
  gap: 8px;
  padding: 0;
  min-height: 26px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}
.pathway-settings__row:last-child { border-bottom: none; }
.pathway-settings__label {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.pathway-settings__control :deep(.v-field) {
  min-height: 24px;
}
.pathway-settings__control :deep(.v-field__input) {
  min-height: 24px;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
}
.pathway-settings__control :deep(.v-field__append-inner) {
  padding-top: 0;
}
.pathway-settings__control :deep(.v-input__details) { display: none; }
.pathway-settings__switch :deep(.v-selection-control) { min-height: 24px; }
.pathway-settings__switch :deep(.v-switch__track) {
  height: 14px;
  min-width: 28px;
  opacity: 0.4;
}
.pathway-settings__switch :deep(.v-switch__thumb) {
  width: 12px;
  height: 12px;
}
</style>
