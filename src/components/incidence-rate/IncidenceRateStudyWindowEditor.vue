<template>
  <v-card
    variant="outlined"
    class="sw-card"
  >
    <v-card-title>
      {{ t('incidenceRate.studyWindow', 'Study Window') }}
      <v-spacer />
      <v-btn
        v-if="!hasWindow"
        size="small"
        @click="enable"
      >
        {{ t('common.add', 'Add') }}
      </v-btn>
      <v-btn
        v-else
        size="small"
        variant="text"
        color="error"
        @click="store.clearStudyWindow"
      >
        {{ t('columns.remove', 'Remove') }}
      </v-btn>
    </v-card-title>
    <v-card-text v-if="hasWindow">
      <div class="row">
        <v-text-field
          :model-value="store.currentIR?.expression.studyWindow?.startDate"
          type="date"
          density="compact"
          hide-details
          :label="t('incidenceRate.studyWindowStart', 'Start date').value"
          @update:model-value="(v: string) => update('startDate', v)"
        />
        <v-text-field
          :model-value="store.currentIR?.expression.studyWindow?.endDate"
          type="date"
          density="compact"
          hide-details
          :label="t('incidenceRate.studyWindowEnd', 'End date').value"
          @update:model-value="(v: string) => update('endDate', v)"
        />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'

const { t } = useI18n()
const store = useIncidenceRateStore()
const hasWindow = computed(() => !!store.currentIR?.expression.studyWindow)

function enable() {
  const today = new Date().toISOString().slice(0, 10)
  store.setStudyWindow({ startDate: '2020-01-01', endDate: today })
}

function update(field: 'startDate' | 'endDate', v: string) {
  const cur = store.currentIR?.expression.studyWindow
  if (!cur) return
  store.setStudyWindow({ ...cur, [field]: v })
}
</script>

<style scoped>
.sw-card {
  margin-bottom: 12px;
}
.row {
  display: flex;
  gap: 12px;
}
</style>
