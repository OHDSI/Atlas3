<template>
  <v-select
    :model-value="modelValue"
    :items="dataSourceItems"
    :loading="loading"
    :disabled="disabled || loading"
    :label="t('dataSources.headingTitle', 'Data Source').value"
    item-title="label"
    item-value="value"
    variant="outlined"
    density="comfortable"
    hide-details
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #prepend-inner>
      <v-icon icon="mdi-database" />
    </template>
  </v-select>
</template>

<script setup lang="ts">
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
  disabled: false
})

defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const dataSourceItems = computed(() => {
  return props.dataSources.map(source => ({
    label: source.sourceName,
    value: source.sourceId
  }))
})
</script>
