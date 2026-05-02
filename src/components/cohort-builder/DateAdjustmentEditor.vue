<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { DateAdjustment } from '@/models/event.types'

const { t } = useI18n()

const props = defineProps<{
  modelValue?: DateAdjustment
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DateAdjustment]
}>()

// Local state with default values
const dateAdjustment = computed<DateAdjustment>({
  get: () =>
    props.modelValue ?? {
      startWith: 'START_DATE',
      startOffset: 0,
      endWith: 'END_DATE',
      endOffset: 0,
    },
  set: (value: DateAdjustment) => emit('update:modelValue', value),
})

// Date reference options
const dateReferenceOptions = [
  { value: 'START_DATE', label: t('options.startDate', 'Start Date').value },
  { value: 'END_DATE', label: t('options.endDate', 'End Date').value },
]

// Update handlers
const updateStartWith = (value: 'START_DATE' | 'END_DATE') => {
  dateAdjustment.value = {
    ...dateAdjustment.value,
    startWith: value,
  }
}

const updateStartOffset = (value: number) => {
  dateAdjustment.value = {
    ...dateAdjustment.value,
    startOffset: value,
  }
}

const updateEndWith = (value: 'START_DATE' | 'END_DATE') => {
  dateAdjustment.value = {
    ...dateAdjustment.value,
    endWith: value,
  }
}

const updateEndOffset = (value: number) => {
  dateAdjustment.value = {
    ...dateAdjustment.value,
    endOffset: value,
  }
}
</script>

<template>
  <v-card
    class="date-adjustment-editor"
    elevation="0"
    variant="outlined"
    color="white"
  >
    <v-card-title class="text-subtitle-1">
      {{ t('components.dateAdjust.criteriaLabel', 'Date Adjustment') }}
    </v-card-title>
    <v-card-text>
      <!-- Start Date Adjustment -->
      <div class="mb-4">
        <div class="text-subtitle-2 mb-2">
          {{ t('common.startDateAdjustment', 'Start Date Adjustment') }}
        </div>
        <v-row dense>
          <v-col
            cols="12"
            md="6"
          >
            <v-select
              :model-value="dateAdjustment.startWith"
              :items="dateReferenceOptions"
              item-title="label"
              item-value="value"
              :label="t('common.startWith', 'Start With').value"
              density="compact"
              variant="outlined"
              hide-details
              @update:model-value="updateStartWith"
            />
          </v-col>
          <v-col
            cols="12"
            md="6"
          >
            <v-text-field
              :model-value="dateAdjustment.startOffset"
              type="number"
              :label="t('common.offsetDays', 'Offset (Days)').value"
              density="compact"
              variant="outlined"
              hide-details
              suffix="days"
              @update:model-value="v => updateStartOffset(Number(v))"
            />
          </v-col>
        </v-row>
      </div>

      <v-divider class="my-4" />

      <!-- End Date Adjustment -->
      <div>
        <div class="text-subtitle-2 mb-2">
          {{ t('common.endDateAdjustment', 'End Date Adjustment') }}
        </div>
        <v-row dense>
          <v-col
            cols="12"
            md="6"
          >
            <v-select
              :model-value="dateAdjustment.endWith"
              :items="dateReferenceOptions"
              item-title="label"
              item-value="value"
              :label="t('common.endWith', 'End With').value"
              density="compact"
              variant="outlined"
              hide-details
              @update:model-value="updateEndWith"
            />
          </v-col>
          <v-col
            cols="12"
            md="6"
          >
            <v-text-field
              :model-value="dateAdjustment.endOffset"
              type="number"
              :label="t('common.offsetDays', 'Offset (Days)').value"
              density="compact"
              variant="outlined"
              hide-details
              suffix="days"
              @update:model-value="v => updateEndOffset(Number(v))"
            />
          </v-col>
        </v-row>
      </div>

      <!-- Explanation -->
      <v-alert
        type="info"
        variant="tonal"
        density="compact"
        class="mt-4"
      >
        <div class="text-caption">
          {{
            t(
              'help.dateAdjustmentExplanation',
              'Shifts criterion event dates by the specified offset. For example, "Start Date + 30 days" means the event start date will be 30 days after the original start date.'
            ).value
          }}
        </div>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.date-adjustment-editor {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background-color: white;
}

.date-adjustment-editor :deep(.v-card-title),
.date-adjustment-editor :deep(.v-card-text) {
  color: rgba(0, 0, 0, 0.87);
}
</style>
