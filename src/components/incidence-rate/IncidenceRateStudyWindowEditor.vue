<template>
  <v-card
    variant="outlined"
    class="sw-card"
  >
    <v-card-title>
      {{ t('incidenceRate.studyWindow', 'Study Window') }}
      <AtlasSpacer />
      <AtlasButton
        v-if="!hasWindow"
        size="sm"
        @click="enable"
      >
        {{ t('common.add', 'Add') }}
      </AtlasButton>
      <AtlasButton
        v-else
        size="sm"
        variant="ghost"
        tone="danger"
        @click="store.clearStudyWindow"
      >
        {{ t('columns.remove', 'Remove') }}
      </AtlasButton>
    </v-card-title>
    <v-card-text v-if="hasWindow">
      <div class="row">
        <AtlasTextField
          :model-value="store.currentIR?.expression.studyWindow?.startDate"
          type="date"
          hide-details
          :label="t('incidenceRate.studyWindowStart', 'Start date').value"
          @update:model-value="(v: string | number) => update('startDate', String(v))"
        />
        <AtlasTextField
          :model-value="store.currentIR?.expression.studyWindow?.endDate"
          type="date"
          hide-details
          :label="t('incidenceRate.studyWindowEnd', 'End date').value"
          @update:model-value="(v: string | number) => update('endDate', String(v))"
        />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasSpacer, AtlasTextField } from '@/components/ui'
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
