<template>
  <div class="pathway-settings">
    <div class="pathway-settings__row">
      <div class="pathway-settings__label">
        {{ t('pathway.combinationWindow', 'Collapse window (days)') }}
      </div>
      <VCombobox
        :model-value="modelValue.combinationWindow"
        :items="combinationWindowOptions"
        :aria-label="t('pathway.combinationWindow', 'Collapse window (days)').value"
        variant="underlined"
        hide-details
        :disabled="readonly"
        type="number"
        step="1"
        inputmode="numeric"
        @update:model-value="updateNumber('combinationWindow', $event)"
      />
    </div>
    <div class="pathway-settings__row">
      <div class="pathway-settings__label">
        {{ t('pathway.minCellCount', 'Minimum cell count') }}
      </div>
      <VCombobox
        :model-value="modelValue.minCellCount"
        :items="minCellCountOptions"
        :aria-label="t('pathway.minCellCount', 'Minimum cell count').value"
        variant="underlined"
        hide-details
        :disabled="readonly"
        type="number"
        step="1"
        inputmode="numeric"
        @update:model-value="updateNumber('minCellCount', $event)"
      />
    </div>
    <div class="pathway-settings__row">
      <div class="pathway-settings__label">
        {{ t('pathway.maxDepth', 'Maximum path length') }}
      </div>
      <VCombobox
        :model-value="modelValue.maxDepth"
        :items="maxDepthOptions"
        :aria-label="t('pathway.maxDepth', 'Maximum path length').value"
        variant="underlined"
        hide-details
        :disabled="readonly"
        type="number"
        step="1"
        inputmode="numeric"
        @update:model-value="updateNumber('maxDepth', $event)"
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
import { VCombobox } from 'vuetify/components'
import { AtlasSwitch } from '@/components/ui'
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

const combinationWindowOptions: number[] = [...COMBINATION_WINDOW_OPTIONS]
const minCellCountOptions: number[] = [...MIN_CELL_COUNT_OPTIONS]
const maxDepthOptions: number[] = [...MAX_DEPTH_OPTIONS]

function update<K extends keyof PathwayDesign>(key: K, value: PathwayDesign[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function updateNumber(
  key: 'combinationWindow' | 'minCellCount' | 'maxDepth',
  value: unknown
) {
  const numericValue = typeof value === 'number' ? value : Number(value)
  const minimum = key === 'maxDepth' ? 1 : 0
  const maximum = key === 'maxDepth' ? 10 : Infinity

  if (Number.isInteger(numericValue) && numericValue >= minimum && numericValue <= maximum) {
    update(key, numericValue)
  }
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
  grid-template-columns: 220px 110px minmax(0, 1fr);
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
