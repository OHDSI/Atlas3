<template>
  <v-card
    variant="outlined"
    class="tar-card"
  >
    <v-card-title>{{ t('incidenceRate.timeAtRisk', 'Time at Risk') }}</v-card-title>
    <v-card-text>
      <div class="row">
        <span class="lbl">{{ t('incidenceRate.tarStart', 'Start') }}</span>
        <v-select
          :model-value="tar.start.DateField"
          :items="DATE_FIELD_OPTIONS"
          density="compact"
          hide-details
          @update:model-value="(v: 'StartDate' | 'EndDate') => updateStart('DateField', v)"
        />
        <span>+</span>
        <v-text-field
          :model-value="tar.start.Offset"
          type="number"
          density="compact"
          hide-details
          style="max-width:120px"
          @update:model-value="(v: string) => updateStart('Offset', Number(v))"
        />
        <span class="d">{{ t('incidenceRate.tarDays', 'days') }}</span>
      </div>
      <div class="row">
        <span class="lbl">{{ t('incidenceRate.tarEnd', 'End') }}</span>
        <v-select
          :model-value="tar.end.DateField"
          :items="DATE_FIELD_OPTIONS"
          density="compact"
          hide-details
          @update:model-value="(v: 'StartDate' | 'EndDate') => updateEnd('DateField', v)"
        />
        <span>+</span>
        <v-text-field
          :model-value="tar.end.Offset"
          type="number"
          density="compact"
          hide-details
          style="max-width:120px"
          @update:model-value="(v: string) => updateEnd('Offset', Number(v))"
        />
        <span class="d">{{ t('incidenceRate.tarDays', 'days') }}</span>
      </div>
      <v-alert
        v-if="errorText"
        type="error"
        density="compact"
        variant="tonal"
      >
        {{ errorText }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import type { TimeAtRisk } from '@/models/incidence-rate.types'

const { t } = useI18n()
const store = useIncidenceRateStore()
const DATE_FIELD_OPTIONS = ['StartDate', 'EndDate'] as const

const tar = computed<TimeAtRisk>(() => store.currentIR?.expression.timeAtRisk ?? {
  start: { DateField: 'StartDate', Offset: 0 },
  end: { DateField: 'EndDate', Offset: 0 },
})

const errorText = computed<string | null>(() => {
  const v = tar.value
  if (v.start.DateField === v.end.DateField && v.end.Offset <= v.start.Offset) {
    return t(
      'incidenceRate.tarError',
      'Time-at-risk end must be after start when both reference the same date',
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
.tar-card { margin-bottom: 12px; }
.row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.lbl { width: 60px; font-weight: 500; }
.d { color: #666; }
</style>
