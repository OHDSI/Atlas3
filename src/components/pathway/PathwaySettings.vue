<template>
  <div class="pathway-settings">
    <div class="pathway-settings__row">
      <label class="pathway-settings__label">{{
        t('pathway.combinationWindow', 'Collapse window (days)')
      }}</label>
      <AtlasSelect
        :model-value="modelValue.combinationWindow as (typeof combinationWindowOptions)[number]"
        :items="combinationWindowOptions"
        variant="underlined"
        hide-details
        :readonly="readonly"
        @update:model-value="(v) => v !== null && update('combinationWindow', v as number)"
      />
    </div>
    <div class="pathway-settings__row">
      <label class="pathway-settings__label">{{
        t('pathway.minCellCount', 'Minimum cell count')
      }}</label>
      <AtlasSelect
        :model-value="modelValue.minCellCount as (typeof minCellCountOptions)[number]"
        :items="minCellCountOptions"
        variant="underlined"
        hide-details
        :readonly="readonly"
        @update:model-value="(v) => v !== null && update('minCellCount', v as number)"
      />
    </div>
    <div class="pathway-settings__row">
      <label class="pathway-settings__label">{{
        t('pathway.maxDepth', 'Maximum path length')
      }}</label>
      <AtlasSelect
        :model-value="modelValue.maxDepth as (typeof maxDepthOptions)[number]"
        :items="maxDepthOptions"
        variant="underlined"
        hide-details
        :readonly="readonly"
        @update:model-value="(v) => v !== null && update('maxDepth', v as number)"
      />
    </div>
    <div class="pathway-settings__row">
      <label class="pathway-settings__label">{{
        t('pathway.allowRepeats', 'Allow repeats')
      }}</label>
      <AtlasSwitch
        :model-value="modelValue.allowRepeats"
        hide-details
        inset
        :readonly="readonly"
        @update:model-value="(v) => v !== null && update('allowRepeats', v)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasSelect, AtlasSwitch } from '@/components/ui'
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
  gap: 8px;
}
.pathway-settings__row {
  display: grid;
  grid-template-columns: 1fr 110px;
  align-items: center;
  gap: 12px;
}
.pathway-settings__label {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
</style>
