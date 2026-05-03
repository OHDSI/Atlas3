<template>
  <v-card
    variant="outlined"
    class="tar-card"
  >
    <v-card-title>{{ t('ir.results.timeAtRisk', 'Time at Risk') }}</v-card-title>
    <v-card-text>
      <div class="row">
        <span class="lbl">{{ t('ir.editor.timeAtRiskStartDate', 'Start') }}</span>
        <AtlasSelect
          :model-value="tar.start.DateField"
          :items="[...DATE_FIELD_OPTIONS]"
          hide-details
          @update:model-value="(v) => updateStart('DateField', v as 'StartDate' | 'EndDate')"
        />
        <span>+</span>
        <AtlasTextField
          :model-value="tar.start.Offset"
          type="number"
          hide-details
          style="max-width: 120px"
          @update:model-value="(v) => updateStart('Offset', Number(v))"
        />
        <span class="d">{{ t('common.days', 'days') }}</span>
      </div>
      <div class="row">
        <span class="lbl">{{ t('ir.editor.timeAtRiskEndDate', 'End') }}</span>
        <AtlasSelect
          :model-value="tar.end.DateField"
          :items="[...DATE_FIELD_OPTIONS]"
          hide-details
          @update:model-value="(v) => updateEnd('DateField', v as 'StartDate' | 'EndDate')"
        />
        <span>+</span>
        <AtlasTextField
          :model-value="tar.end.Offset"
          type="number"
          hide-details
          style="max-width: 120px"
          @update:model-value="(v) => updateEnd('Offset', Number(v))"
        />
        <span class="d">{{ t('common.days', 'days') }}</span>
      </div>
      <AtlasAlert
        v-if="errorText"
        severity="danger"
        density="compact"
      >
        {{ errorText }}
      </AtlasAlert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasSelect, AtlasTextField } from '@/components/ui'
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import type { TimeAtRisk } from '@/models/incidence-rate.types'

const { t } = useI18n()
const store = useIncidenceRateStore()
const DATE_FIELD_OPTIONS = ['StartDate', 'EndDate'] as const

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
.tar-card {
  margin-bottom: 12px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.lbl {
  width: 60px;
  font-weight: 500;
}
.d {
  color: #666;
}
</style>
