<template>
  <div class="numeric-range d-flex align-center ga-2 flex-nowrap">
    <AtlasSelect
      v-model="operator"
      class="numeric-range__operator"
      :items="operators"
      item-title="title"
      item-value="value"
      variant="outlined"
      density="compact"
      hide-details
    />
    <AtlasTextField
      v-model="value"
      class="numeric-range__value"
      type="number"
      variant="outlined"
      density="compact"
      hide-details
    />
    <AtlasTextField
      v-if="operator === 'bt' || operator === '!bt'"
      v-model="extent"
      class="numeric-range__extent"
      type="number"
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
import type { NumericRange, NumericRangeOp } from '../circe.types'
import { optionalNumberBinding } from './bindings'

const { t } = useI18n()

const props = defineProps<{
  modelValue: NumericRange
}>()

const modelValue = toRef(props, 'modelValue')

const operators = computed(() => [
  { title: t('options.lessThan', 'less than').value, value: 'lt' },
  { title: t('options.lessThanOrEqual', 'less than or equal').value, value: 'lte' },
  { title: t('options.equal', 'equal').value, value: 'eq' },
  { title: t('options.notEqual', 'not equal').value, value: '!eq' },
  { title: t('options.greaterThan', 'greater than').value, value: 'gt' },
  { title: t('options.greaterThanOrEqual', 'greater than or equal').value, value: 'gte' },
  { title: t('options.between', 'between').value, value: 'bt' },
  { title: t('options.notBetween', 'not between').value, value: '!bt' },
])
const defaultOperator = 'gte'

const operator = computed<NumericRangeOp>({
  get: () => modelValue.value.Op ?? defaultOperator,
  set: value => {
    modelValue.value.Op = value
  },
})

const value = optionalNumberBinding(modelValue, 'Value')
const extent = optionalNumberBinding(modelValue, 'Extent')
</script>

<style scoped>
.numeric-range__operator {
  min-width: 160px;
  max-width: 160px;
  flex: 0 0 160px;
}

.numeric-range__value,
.numeric-range__extent {
  min-width: 130px;
  max-width: 130px;
  flex: 0 0 130px;
}
</style>
