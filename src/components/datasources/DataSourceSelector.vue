<template>
  <AtlasSelect
    :model-value="modelValue"
    :items="dataSourceItems"
    :loading="loading"
    :disabled="disabled || loading"
    :label="t('dataSources.headingTitle', 'Data Source').value"
    item-title="label"
    item-value="value"
    variant="outlined"
    hide-details
    prepend-inner-icon="mdi-database"
    @update:model-value="$emit('update:modelValue', $event as number | null)"
  />
</template>

<script setup lang="ts">
import { AtlasSelect } from '@/components/ui'
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { DataSource } from '@/models/datasource.types'

const { t } = useI18n()

interface Props {
  modelValue: number | null
  dataSources: DataSource[]
  loading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
})

defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const dataSourceItems = computed(() => {
  return props.dataSources.map(source => ({
    label: source.sourceName,
    value: source.sourceId,
  }))
})
</script>
