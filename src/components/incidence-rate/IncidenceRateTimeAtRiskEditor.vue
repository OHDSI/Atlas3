<template>
  <div class="tar-editor">
    <div class="row">
      <span class="row__label">{{ t('common.from', 'From').value }}</span>
      <AtlasSelect
        :model-value="tar.start.DateField"
        :items="dateFieldItems"
        item-title="title"
        item-value="value"
        variant="outlined"
        hide-details
        class="row__select"
        @update:model-value="(v) => updateStart('DateField', v as 'StartDate' | 'EndDate')"
      />
      <span class="op">+</span>
      <AtlasTextField
        :model-value="tar.start.Offset"
        type="number"
        variant="outlined"
        hide-spin-buttons
        hide-details
        class="row__offset"
        @update:model-value="(v) => updateStart('Offset', Number(v))"
      />
      <span class="d">d</span>
      <span class="row__label">{{ t('common.to', 'to').value }}</span>
      <AtlasSelect
        :model-value="tar.end.DateField"
        :items="dateFieldItems"
        item-title="title"
        item-value="value"
        variant="outlined"
        hide-details
        class="row__select"
        @update:model-value="(v) => updateEnd('DateField', v as 'StartDate' | 'EndDate')"
      />
      <span class="op">+</span>
      <AtlasTextField
        :model-value="tar.end.Offset"
        type="number"
        variant="outlined"
        hide-spin-buttons
        hide-details
        class="row__offset"
        @update:model-value="(v) => updateEnd('Offset', Number(v))"
      />
      <span class="d">d</span>
    </div>
    <AtlasAlert
      v-if="errorText"
      severity="danger"
      density="compact"
    >
      {{ errorText }}
    </AtlasAlert>
  </div>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasSelect, AtlasTextField } from '@/components/ui'
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import type { TimeAtRisk } from '@/models/incidence-rate.types'

const { t, tv } = useI18n()
const store = useIncidenceRateStore()

const dateFieldItems = computed(() => [
  { title: tv('ir.editor.timeAtRiskCohortStart', 'Cohort start'), value: 'StartDate' as const },
  { title: tv('ir.editor.timeAtRiskCohortEnd', 'Cohort end'), value: 'EndDate' as const },
])

const tar = computed<TimeAtRisk>(
  () =>
    store.currentIR?.expression.timeAtRisk ?? {
      start: { DateField: 'StartDate', Offset: 0 },
      end: { DateField: 'EndDate', Offset: 0 },
    }
)

const errorText = computed<string | null>(() => {
  const v = tar.value
  if (v.start.DateField === v.end.DateField && v.end.Offset <= v.start.Offset) {
    return t(
      'ir.editor.timeAtRiskWarningMessage',
      'Time-at-risk end must be after start when both reference the same date'
    ).value
  }
  return null
})

function updateStart<K extends keyof TimeAtRisk['start']>(key: K, value: TimeAtRisk['start'][K]) {
  store.updateTimeAtRisk({ start: { ...tar.value.start, [key]: value } })
}
function updateEnd<K extends keyof TimeAtRisk['end']>(key: K, value: TimeAtRisk['end'][K]) {
  store.updateTimeAtRisk({ end: { ...tar.value.end, [key]: value } })
}
</script>

<style scoped>
.tar-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  min-width: 0;
}
.row__select {
  flex: 0 0 144px;
}
.row__offset {
  flex: 0 0 76px;
}
.row__select :deep(.v-field),
.row__offset :deep(.v-field),
.row__select :deep(.v-field__field),
.row__offset :deep(.v-field__field),
.row__select :deep(.v-field__input),
.row__offset :deep(.v-field__input) {
  box-sizing: border-box;
  height: 32px;
  min-height: 32px;
}
.row__select :deep(.v-field__field),
.row__offset :deep(.v-field__field),
.row__select :deep(.v-field__input),
.row__offset :deep(.v-field__input) {
  align-items: center;
}
.row__select :deep(.v-field__input),
.row__offset :deep(.v-field__input) {
  padding-top: 0;
  padding-bottom: 0;
}
.row__select :deep(.v-field__append-inner) {
  align-items: center;
  box-sizing: border-box;
  height: 32px;
  min-height: 32px;
  padding-top: 0;
  padding-bottom: 0;
}
.row__select :deep(.v-select__selection-text) {
  min-height: 0;
}
.row__label {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.op {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
.d {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  flex: 0 0 auto;
}
</style>
