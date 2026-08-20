<template>
  <div class="text-filter d-flex align-center ga-2 flex-nowrap">
    <AtlasSelect
      v-model="operator"
      class="text-filter__operator"
      :items="operators"
      item-title="title"
      item-value="value"
      variant="outlined"
      density="compact"
      hide-details
    />
    <AtlasTextField
      v-model="text"
      class="text-filter__value"
      variant="outlined"
      density="compact"
      hide-details
    />
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { AtlasSelect, AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { TextFilter, TextFilterOp } from '@/models/circe-types'

const { t } = useI18n()

const props = defineProps<{
  modelValue: TextFilter
}>()

const modelValue = toRef(props, 'modelValue')

const operators = computed(() => [
  { title: t('options.endsWith', 'ends with').value, value: 'endsWith' },
  { title: t('options.startsWith', 'starts with').value, value: 'startsWith' },
  { title: t('options.contains', 'contains').value, value: 'contains' },
  { title: t('options.notEndsWith', 'not ends with').value, value: '!endsWith' },
  { title: t('options.notStartsWith', 'not starts with').value, value: '!startsWith' },
  { title: t('options.notContains', 'not contains').value, value: '!contains' },
])

const operator = computed<TextFilterOp | undefined>({
  get: () => modelValue.value.Op ?? undefined,
  set: (value: TextFilterOp | null | undefined) => {
    if (value === null || value === undefined) return
    modelValue.value.Op = value
  },
})

const text = computed<string | undefined>({
  get: () => modelValue.value.Text ?? undefined,
  set: (value: string | null | undefined) => {
    modelValue.value.Text = value === '' || value === null || value === undefined ? undefined : value
  },
})
</script>

<style scoped>
.text-filter__operator {
  min-width: 140px;
  max-width: 140px;
  flex: 0 0 140px;
}

.text-filter__value {
  min-width: 180px;
  flex: 1 1 auto;
}
</style>
