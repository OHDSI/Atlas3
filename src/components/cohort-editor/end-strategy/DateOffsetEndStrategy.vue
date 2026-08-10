<template>
  <div class="date-offset-end-strategy">
    <div class="strategy-hint">
      <AtlasIcon
        size="16"
        class="strategy-hint__icon"
      >
        mdi-information-outline
      </AtlasIcon>
      <span>Cohort exit is a fixed number of days from a date derived from the qualifying event.</span>
    </div>

    <div class="date-offset-end-strategy__fields mt-4">
      <div class="date-offset-end-strategy__date-field">
        <div class="date-offset-end-strategy__field-label">
          Date Field
        </div>
        <div class="date-offset-end-strategy__toggle">
          <AtlasButton
            :variant="dateField === 'StartDate' ? 'tonal' : 'outlined'"
            size="small"
            @click="dateField = 'StartDate'"
          >
            Start Date
          </AtlasButton>
          <AtlasButton
            :variant="dateField === 'EndDate' ? 'tonal' : 'outlined'"
            size="small"
            @click="dateField = 'EndDate'"
          >
            End Date
          </AtlasButton>
        </div>
      </div>

      <AtlasTextField
        v-model.number="offset"
        type="number"
        label="Offset (days)"
        variant="outlined"
        density="compact"
        hide-details
        min="0"
        class="date-offset-end-strategy__offset"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasButton, AtlasIcon, AtlasTextField } from '@/components/ui'
import type { DateOffsetStrategy } from '../circe.types'

const props = defineProps<{
  strategy: DateOffsetStrategy
}>()

const dateField = computed<'StartDate' | 'EndDate'>({
  get: () => props.strategy.DateField ?? 'StartDate',
  set: value => {
    props.strategy.DateField = value
  },
})

const offset = computed<number>({
  get: () => props.strategy.Offset ?? 0,
  set: value => {
    props.strategy.Offset = Number(value) || 0
  },
})
</script>

<style scoped>
.date-offset-end-strategy {
  padding: 14px 0 6px;
}

.strategy-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
}

.strategy-hint__icon {
  color: rgb(var(--v-theme-primary));
  opacity: 0.7;
  flex-shrink: 0;
  margin-top: 2px;
}

.date-offset-end-strategy__fields {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.date-offset-end-strategy__date-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-offset-end-strategy__field-label {
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface-variant));
  white-space: nowrap;
}

.date-offset-end-strategy__offset {
  max-width: 160px;
}

.date-offset-end-strategy__toggle :deep(.v-btn-toggle) {
  border-radius: 999px;
  overflow: hidden;
}

.date-offset-end-strategy__toggle {
  display: inline-flex;
  gap: 0;
  border-radius: 999px;
  overflow: hidden;
}

.date-offset-end-strategy__toggle :deep(.atlas-button) {
  min-height: 28px;
  padding-inline: 10px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}
</style>
