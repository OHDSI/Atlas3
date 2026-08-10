<template>
  <div class="period-editor d-flex align-center ga-2 flex-nowrap">
    <AtlasTextField
      v-model="startDate"
      class="period-editor__value"
      type="date"
      variant="outlined"
      density="compact"
      hide-details
      :label="startLabel"
    />
    <span class="period-editor__and text-medium-emphasis">{{ andLabel }}</span>
    <AtlasTextField
      v-model="endDate"
      class="period-editor__value"
      type="date"
      variant="outlined"
      density="compact"
      hide-details
      :label="endLabel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { Period } from '../circe.types'
import { optionalTextBinding } from './bindings'

const { t } = useI18n()

const props = defineProps<{
  modelValue: Period
}>()

const modelValue = toRef(props, 'modelValue')

const startLabel = computed(() => t('common.startDate', 'start date').value)
const endLabel = computed(() => t('common.endDate', 'end date').value)
const andLabel = computed(() => t('common.and', 'and').value)

const startDate = optionalTextBinding(modelValue, 'StartDate')
const endDate = optionalTextBinding(modelValue, 'EndDate')
</script>

<style scoped>
.period-editor__value {
  min-width: 150px;
  max-width: 150px;
  flex: 0 0 150px;
}

.period-editor__and {
  white-space: nowrap;
}
</style>