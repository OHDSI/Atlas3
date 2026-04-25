<template>
  <v-table density="compact">
    <tbody>
      <tr>
        <th>Collapse window (days)</th>
        <td>
          <v-select
            :model-value="modelValue.combinationWindow as (typeof combinationWindowOptions)[number]"
            :items="combinationWindowOptions"
            density="compact"
            hide-details
            :readonly="readonly"
            @update:model-value="(v: number | null) => v !== null && update('combinationWindow', v)"
          />
        </td>
      </tr>
      <tr>
        <th>Minimum cell count</th>
        <td>
          <v-select
            :model-value="modelValue.minCellCount as (typeof minCellCountOptions)[number]"
            :items="minCellCountOptions"
            density="compact"
            hide-details
            :readonly="readonly"
            @update:model-value="(v: number | null) => v !== null && update('minCellCount', v)"
          />
        </td>
      </tr>
      <tr>
        <th>Maximum path length</th>
        <td>
          <v-select
            :model-value="modelValue.maxDepth as (typeof maxDepthOptions)[number]"
            :items="maxDepthOptions"
            density="compact"
            hide-details
            :readonly="readonly"
            @update:model-value="(v: number | null) => v !== null && update('maxDepth', v)"
          />
        </td>
      </tr>
      <tr>
        <th>Allow repeats</th>
        <td>
          <v-switch
            :model-value="modelValue.allowRepeats"
            density="compact"
            hide-details
            :readonly="readonly"
            @update:model-value="(v: boolean | null) => v !== null && update('allowRepeats', v)"
          />
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
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

// Vuetify v-select expects a mutable array, not readonly
const combinationWindowOptions = [...COMBINATION_WINDOW_OPTIONS]
const minCellCountOptions = [...MIN_CELL_COUNT_OPTIONS]
const maxDepthOptions = [...MAX_DEPTH_OPTIONS]

function update<K extends keyof PathwayDesign>(key: K, value: PathwayDesign[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>
