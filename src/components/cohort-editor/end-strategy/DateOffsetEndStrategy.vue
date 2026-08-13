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
        <v-btn-toggle
          class="date-offset-end-strategy__toggle"
          :model-value="dateField"
          mandatory
          variant="outlined"
          density="compact"
          divided
          @update:model-value="dateField = $event"
        >
          <AtlasButton
            value="StartDate"
            size="sm"
          >
            Start Date
          </AtlasButton>
          <AtlasButton
            value="EndDate"
            size="sm"
          >
            End Date
          </AtlasButton>
        </v-btn-toggle>
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

.date-offset-end-strategy__toggle :deep(.v-btn-toggle > .v-btn) {
  border-radius: 0 !important;
  min-width: 0;
  padding: 0 12px;
  height: 26px !important;
  background: transparent !important;
  color: rgb(var(--v-theme-on-surface-variant));
  font-weight: 500;
  letter-spacing: 0.02em;
}

.date-offset-end-strategy__toggle :deep(.v-btn-toggle > .v-btn:first-child) {
  border-top-left-radius: 999px !important;
  border-bottom-left-radius: 999px !important;
}

.date-offset-end-strategy__toggle :deep(.v-btn-toggle > .v-btn:last-child) {
  border-top-right-radius: 999px !important;
  border-bottom-right-radius: 999px !important;
}

.date-offset-end-strategy__toggle :deep(.v-btn-toggle .v-btn:hover:not(.v-btn--active)) {
  color: rgb(var(--v-theme-on-surface));
}

.date-offset-end-strategy__toggle :deep(.v-btn-toggle .v-btn--active) {
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}
</style>
