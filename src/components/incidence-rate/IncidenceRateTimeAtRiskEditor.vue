<template>
  <div class="tar-editor">
    <div>
      <div class="row">
        <span class="lbl">{{ t('common.start', 'Start').value }}</span>
        <AtlasSelect
          :model-value="tar.start.DateField"
          :items="dateFieldItems"
          item-title="title"
          item-value="value"
          hide-details
          class="row__select"
          @update:model-value="(v) => updateStart('DateField', v as 'StartDate' | 'EndDate')"
        />
        <span class="op">+</span>
        <AtlasTextField
          :model-value="tar.start.Offset"
          type="number"
          hide-details
          class="row__offset"
          @update:model-value="(v) => updateStart('Offset', Number(v))"
        />
        <span class="d">d</span>
      </div>
      <div class="row">
        <span class="lbl">{{ t('common.end', 'End').value }}</span>
        <AtlasSelect
          :model-value="tar.end.DateField"
          :items="dateFieldItems"
          item-title="title"
          item-value="value"
          hide-details
          class="row__select"
          @update:model-value="(v) => updateEnd('DateField', v as 'StartDate' | 'EndDate')"
        />
        <span class="op">+</span>
        <AtlasTextField
          :model-value="tar.end.Offset"
          type="number"
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
  min-width: 0;
}
.row__select {
  flex: 1 1 auto;
  min-width: 0;
}
.row__offset {
  flex: 0 0 60px;
}
.lbl {
  flex: 0 0 36px;
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
