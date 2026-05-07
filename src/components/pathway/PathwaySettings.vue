<template>
  <div class="pathway-settings">
    <div class="pathway-settings__row">
      <div class="pathway-settings__label">
        {{ t('pathway.combinationWindow', 'Collapse window (days)') }}
      </div>
      <AtlasSelect
        :model-value="modelValue.combinationWindow as (typeof combinationWindowOptions)[number]"
        :items="combinationWindowOptions"
        :aria-label="t('pathway.combinationWindow', 'Collapse window (days)').value"
        variant="underlined"
        hide-details
        :readonly="readonly"
        @update:model-value="(v) => v !== null && update('combinationWindow', v as number)"
      />
    </div>
    <div class="pathway-settings__row">
      <div class="pathway-settings__label">
        {{ t('pathway.minCellCount', 'Minimum cell count') }}
      </div>
      <AtlasSelect
        :model-value="modelValue.minCellCount as (typeof minCellCountOptions)[number]"
        :items="minCellCountOptions"
        :aria-label="t('pathway.minCellCount', 'Minimum cell count').value"
        variant="underlined"
        hide-details
        :readonly="readonly"
        @update:model-value="(v) => v !== null && update('minCellCount', v as number)"
      />
    </div>
    <div class="pathway-settings__row">
      <div class="pathway-settings__label">
        {{ t('pathway.maxDepth', 'Maximum path length') }}
      </div>
      <AtlasSelect
        :model-value="modelValue.maxDepth as (typeof maxDepthOptions)[number]"
        :items="maxDepthOptions"
        :aria-label="t('pathway.maxDepth', 'Maximum path length').value"
        variant="underlined"
        hide-details
        :readonly="readonly"
        @update:model-value="(v) => v !== null && update('maxDepth', v as number)"
      />
    </div>
    <div class="pathway-settings__row">
      <div class="pathway-settings__label">
        {{ t('pathway.allowRepeats', 'Allow repeats') }}
      </div>
      <AtlasSwitch
        :model-value="modelValue.allowRepeats"
        :aria-label="t('pathway.allowRepeats', 'Allow repeats').value"
        hide-details
        :readonly="readonly"
        class="pathway-settings__switch"
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
.pathway-settings__switch :deep(.v-switch__track) {
  opacity: 1;
  background: rgba(var(--v-theme-on-surface), 0.38);
}
.pathway-settings__switch :deep(.v-selection-control--dirty .v-switch__track) {
  background: rgb(var(--v-theme-primary));
}
</style>
