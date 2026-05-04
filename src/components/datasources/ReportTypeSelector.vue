<template>
  <AtlasSelect
    :model-value="modelValue"
    :items="reportTypeItems"
    :disabled="disabled"
    :label="t('common.reportType', 'Report Type').value"
    item-title="label"
    item-value="value"
    variant="outlined"
    hide-details
    prepend-inner-icon="mdi-chart-bar"
    @update:model-value="$emit('update:modelValue', $event as ReportType | null)"
  />
</template>

<script setup lang="ts">
import { AtlasSelect } from '@/components/ui'
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { REPORT_TYPE_LABELS, type ReportType } from '@/models/datasource.types'

const { t } = useI18n()

interface Props {
  modelValue: ReportType | null
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  disabled: false,
})

defineEmits<{
  'update:modelValue': [value: ReportType | null]
}>()

const reportTypeItems = computed(() => {
  return Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => ({
    label,
    value: value as ReportType,
  }))
})
</script>
