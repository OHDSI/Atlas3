<template>
  <div class="fixed-duration-strategy">
    <!-- Strategy-specific help text -->
    <div class="strategy-hint">
      <AtlasIcon
        icon="mdi-information-outline"
        size="16"
        class="strategy-hint-icon"
      />
      <span>{{
        tv(
          'components.dateOffsetStrategy.dateOffsetStrategyText_2',
          'Event persists for a specified number of days from start or end date'
        )
      }}</span>
    </div>

    <!-- Fixed Duration Fields -->
    <AtlasRow class="mt-4">
      <AtlasCol cols="6">
        <AtlasSelect
          v-model="strategy.dateField"
          :items="dateFieldOptions"
          :label="
            tv('components.dateOffsetStrategy.dateOffsetStrategyText_3', 'Date Field')
          "
          :disabled="disabled"
          variant="outlined"
        />
      </AtlasCol>
      <AtlasCol cols="6">
        <AtlasTextField
          v-model.number="strategy.offset"
          :label="
            tv('components.dateOffsetStrategy.dateOffsetStrategyText_4', 'Offset (days)')
          "
          :disabled="disabled"
          :rules="[nonNegativeRule]"
          variant="outlined"
        />
      </AtlasCol>
    </AtlasRow>
  </div>
</template>

<script setup lang="ts">
import { AtlasIcon, AtlasRow, AtlasCol, AtlasSelect, AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { ExitCriteria } from '@/models/cohort.types'

const { tv } = useI18n()

interface Props {
  strategy: ExitCriteria
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  disabled: false,
})

// Date field options
const dateFieldOptions = [
  { value: 'START_DATE', title: tv('columns.startDate', 'Start Date') },
  { value: 'END_DATE', title: tv('columns.endDate', 'End Date') },
]

// Validation rules
const nonNegativeRule = (value: number) => {
  if (value < 0) {
    return tv('exitCriteria.validation.offsetNonNegative', 'Offset values must be non-negative')
  }
  return true
}
</script>

<style scoped>
.fixed-duration-strategy {
  padding: 12px 16px;
}

.strategy-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
}

.strategy-hint-icon {
  color: rgb(var(--v-theme-primary));
  opacity: 0.7;
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
