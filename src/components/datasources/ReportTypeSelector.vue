<template>
  <v-select
    :model-value="modelValue"
    :items="reportTypeItems"
    :disabled="disabled"
    label="Report Type"
    item-title="label"
    item-value="value"
    variant="outlined"
    density="comfortable"
    hide-details
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #prepend-inner>
      <v-icon icon="mdi-chart-bar" />
    </template>
  </v-select>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { REPORT_TYPE_LABELS, type ReportType } from '@/models/datasource.types'

interface Props {
  modelValue: ReportType | null
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  disabled: false
})

defineEmits<{
  'update:modelValue': [value: ReportType | null]
}>()

const reportTypeItems = computed(() => {
  return Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => ({
    label,
    value: value as ReportType
  }))
})
</script>
