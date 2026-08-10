<template>
  <div class="date-range d-flex align-center ga-2 flex-nowrap">
    <AtlasSelect
      v-model="operator"
      class="date-range__operator"
      :items="operators"
      item-title="title"
      item-value="value"
      variant="outlined"
      density="compact"
      hide-details
    />
    <AtlasTextField
      v-model="value"
      class="date-range__value"
      type="date"
      variant="outlined"
      density="compact"
      hide-details
    />
    <template v-if="operator === 'bt' || operator === '!bt'">
      <span class="date-range__and text-medium-emphasis">{{ andLabel }}</span>
      <AtlasTextField
        v-model="extent"
        class="date-range__extent"
        type="date"
        variant="outlined"
        density="compact"
        hide-details
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { AtlasSelect, AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { DateRange, DateRangeOp } from '../circe.types'
import { optionalTextBinding } from './bindings'

const { t } = useI18n()

const props = defineProps<{
  modelValue: DateRange
}>()

const modelValue = toRef(props, 'modelValue')

const operators = computed(() => [
  { title: t('options.before', 'before').value, value: 'lt' },
  { title: t('options.onOrBefore', 'on or before').value, value: 'lte' },
  { title: t('options.on', 'on').value, value: 'eq' },
  { title: t('options.notOn', 'not on').value, value: '!eq' },
  { title: t('options.after', 'after').value, value: 'gt' },
  { title: t('options.onOrAfter', 'on or after').value, value: 'gte' },
  { title: t('options.between', 'between').value, value: 'bt' },
  { title: t('options.notBetween', 'not between').value, value: '!bt' },
])

const andLabel = computed(() => t('common.and', 'and').value)

const operator = computed<DateRangeOp | undefined>({
  get: () => modelValue.value.Op,
  set: value => {
    modelValue.value.Op = value
  },
})

const value = optionalTextBinding(modelValue, 'Value')
const extent = optionalTextBinding(modelValue, 'Extent')
</script>

<style scoped>
.date-range__operator {
  min-width: 120px;
  max-width: 120px;
  flex: 0 0 120px;
}

.date-range__value,
.date-range__extent {
  min-width: 130px;
  max-width: 130px;
  flex: 0 0 130px;
}

.date-range__and {
  white-space: nowrap;
}
</style>
