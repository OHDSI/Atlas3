<template>
  <AtlasMenu
    v-model="menuOpen"
    :close-on-content-click="false"
    location="bottom"
    offset="8"
  >
    <template #activator="{ props: menuProps }">
      <AtlasChip
        v-bind="menuProps"
        class="date-adjustment-editor__chip"
        color="primary"
        data-testid="attribute-date-adjustment-chip"
        label
        prepend-icon="mdi-calendar-edit"
        variant="outlined"
      >
        {{ summaryLabel }}
      </AtlasChip>
    </template>

    <v-card
      class="date-adjustment-editor__menu"
      rounded="lg"
    >
      <v-card-text class="d-flex flex-column ga-4">
        <div class="text-subtitle-1">
          {{ dateAdjustmentLabel }}
        </div>
        <div>
          <div class="text-subtitle-2 mb-2">
            {{ startDateAdjustmentLabel }}
          </div>

          <div class="date-adjustment-editor__row d-flex ga-3 flex-wrap">
            <AtlasSelect
              v-model="modelValue.StartWith"
              class="date-adjustment-editor__select"
              :items="dateReferenceOptions"
              item-title="label"
              item-value="value"
              :label="startWithLabel"
              variant="outlined"
              density="compact"
              hide-details
            />

            <AtlasTextField
              v-model="startOffset"
              class="date-adjustment-editor__offset"
              :label="offsetDaysLabel"
              type="number"
              variant="outlined"
              density="compact"
              hide-details
              :suffix="daysSuffix"
            />
          </div>
        </div>

        <AtlasDivider />

        <div>
          <div class="text-subtitle-2 mb-2">
            {{ endDateAdjustmentLabel }}
          </div>

          <div class="date-adjustment-editor__row d-flex ga-3 flex-wrap">
            <AtlasSelect
              v-model="modelValue.EndWith"
              class="date-adjustment-editor__select"
              :items="dateReferenceOptions"
              item-title="label"
              item-value="value"
              :label="endWithLabel"
              variant="outlined"
              density="compact"
              hide-details
            />

            <AtlasTextField
              v-model="endOffset"
              class="date-adjustment-editor__offset"
              :label="offsetDaysLabel"
              type="number"
              variant="outlined"
              density="compact"
              hide-details
              :suffix="daysSuffix"
            />
          </div>
        </div>
      </v-card-text>
    </v-card>
  </AtlasMenu>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { useI18n } from '@/composables/useI18n'
import {
  AtlasChip,
  AtlasDivider,
  AtlasMenu,
  AtlasSelect,
  AtlasTextField,
} from '@/components/ui'
import type { DateAdjustment } from '../circe.types'
import { numberBinding } from './bindings'

const { t } = useI18n()

const props = defineProps<{
  modelValue: DateAdjustment
}>()

const menuOpen = ref(false)
const modelValue = toRef(props, 'modelValue')
const startOffset = numberBinding(modelValue, 'StartOffset')
const endOffset = numberBinding(modelValue, 'EndOffset')

const dateReferenceOptions = computed(() => [
  { label: t('options.startDate', 'Start Date').value, value: 'START_DATE' },
  { label: t('options.endDate', 'End Date').value, value: 'END_DATE' },
])

const dateAdjustmentLabel = computed(() => t('components.dateAdjust.criteriaLabel', 'Date Adjustment').value)
const startDateAdjustmentLabel = computed(() => t('common.startDateAdjustment', 'Start Date Adjustment').value)
const endDateAdjustmentLabel = computed(() => t('common.endDateAdjustment', 'End Date Adjustment').value)
const startWithLabel = computed(() => t('common.startWith', 'Start With').value)
const endWithLabel = computed(() => t('common.endWith', 'End With').value)
const offsetDaysLabel = computed(() => t('common.offsetDays', 'Offset (Days)').value)
const daysSuffix = computed(() => t('common.days', 'days').value)
const summaryStartLabel = computed(() => t('common.start', 'Start').value)
const summaryEndLabel = computed(() => t('common.end', 'End').value)

const summaryLabel = computed(() => {
  return `${summaryStartLabel.value}: ${formatDateReference(modelValue.value.StartWith)} ${formatOffset(modelValue.value.StartOffset)}, ${summaryEndLabel.value}: ${formatDateReference(modelValue.value.EndWith)} ${formatOffset(modelValue.value.EndOffset)}`
})

function formatDateReference(value: 'START_DATE' | 'END_DATE' | undefined) {
  return value === 'END_DATE' ? summaryEndLabel.value : summaryStartLabel.value
}

function formatOffset(value: number | undefined) {
  const offset = value ?? 0
  const sign = offset < 0 ? '-' : '+'
  return `${sign}${Math.abs(offset)}${t('common.daysAbbr', 'd').value}`
}
</script>

<style scoped>
.date-adjustment-editor__chip {
  cursor: pointer;
  text-transform: none;
}

.date-adjustment-editor__menu {
  min-width: 420px;
  max-width: min(560px, calc(100vw - 32px));
}

.date-adjustment-editor__select,
.date-adjustment-editor__offset {
  flex: 1 1 180px;
}
</style>