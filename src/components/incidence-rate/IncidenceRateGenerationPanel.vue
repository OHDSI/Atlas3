<template>
  <div class="gen-panel">
    <v-card variant="outlined">
      <v-card-title>{{ t('incidenceRate.generation', 'Generation') }}</v-card-title>
      <v-card-text>
        <div class="filters">
          <v-select
            :model-value="store.selectedTargetId"
            :items="targetOptions"
            :label="t('incidenceRate.target', 'Target').value"
            density="compact"
            hide-details
            @update:model-value="(v: number | null) => store.setSelectedTargetOutcome(v, store.selectedOutcomeId)"
          />
          <v-select
            :model-value="store.selectedOutcomeId"
            :items="outcomeOptions"
            :label="t('incidenceRate.outcome', 'Outcome').value"
            density="compact"
            hide-details
            @update:model-value="(v: number | null) => store.setSelectedTargetOutcome(store.selectedTargetId, v)"
          />
          <v-select
            :model-value="store.rateMultiplier"
            :items="multiplierOptions"
            :label="t('incidenceRate.rateMultiplier', 'Rate per').value"
            density="compact"
            hide-details
            @update:model-value="(v: number) => store.setRateMultiplier(v as never)"
          />
        </div>

        <v-table
          density="compact"
          class="mt-3"
        >
          <thead>
            <tr>
              <th />
              <th>{{ t('incidenceRate.source', 'Data Source') }}</th>
              <th>{{ t('incidenceRate.status', 'Status') }}</th>
              <th>{{ t('incidenceRate.persons', 'Persons') }}</th>
              <th>{{ t('incidenceRate.cases', 'Cases') }}</th>
              <th>{{ t('incidenceRate.tarYears', 'TAR (years)') }}</th>
              <th>{{ t('incidenceRate.rate', 'Rate') }}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="src in sources"
              :key="src.sourceKey"
            >
              <td>
                <v-btn
                  v-if="!isRunning(src.sourceKey)"
                  size="x-small"
                  color="primary"
                  @click="onGenerate(src.sourceKey)"
                >
                  {{ t('incidenceRate.generateBtn', 'Generate') }}
                </v-btn>
                <v-btn
                  v-else
                  size="x-small"
                  color="error"
                  @click="onCancel(src.sourceKey)"
                >
                  {{ t('common.cancel', 'Cancel') }}
                </v-btn>
              </td>
              <td>{{ src.sourceName }}</td>
              <td>{{ rowFor(src.sourceKey)?.executionInfo.status ?? '—' }}</td>
              <td>{{ formatNum(matchingSummary(src.sourceKey)?.totalPersons) }}</td>
              <td>{{ formatNum(matchingSummary(src.sourceKey)?.cases) }}</td>
              <td>{{ formatNum(toYears(matchingSummary(src.sourceKey)?.timeAtRisk)) }}</td>
              <td>{{ formatRate(matchingSummary(src.sourceKey)?.rate) }}</td>
              <td>
                <v-btn
                  size="x-small"
                  variant="text"
                  :disabled="!matchingSummary(src.sourceKey)"
                  @click="store.setSelectedSource(src.sourceKey)"
                >
                  {{ t('incidenceRate.viewReport', 'View report') }}
                </v-btn>
              </td>
            </tr>
            <tr v-if="sources.length === 0">
              <td
                colspan="8"
                class="empty"
              >
                {{ t('incidenceRate.noSources', 'No data sources available.') }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <IncidenceRateReport
      v-if="store.selectedSourceKey && store.selectedTargetId && store.selectedOutcomeId"
      :ir-id="props.irId"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useDataSourcesStore } from '@/stores/datasources'
import { useIncidenceRateGeneration } from '@/composables/useIncidenceRateGeneration'
import { RATE_MULTIPLIER_OPTIONS, IR_TERMINAL_STATUSES } from '@/models/incidence-rate.types'
import IncidenceRateReport from '@/components/incidence-rate/IncidenceRateReport.vue'

const props = defineProps<{ irId: number }>()
const { t } = useI18n()
const store = useIncidenceRateStore()
const dsStore = useDataSourcesStore()
const gen = useIncidenceRateGeneration(props.irId)

onMounted(() => {
  gen.pollOnce()  // initial fetch
})
onBeforeUnmount(() => gen.stopPolling())

const sources = computed(() =>
  (dsStore.sources ?? []).map(s => ({
    sourceKey: s.sourceKey,
    sourceName: s.sourceName ?? s.sourceKey,
  }))
)

const targetOptions = computed(() =>
  (store.currentIR?.expression.targetIds ?? []).map(id => ({
    title: store.cohortNameById.get(id) ?? `Cohort ${id}`,
    value: id,
  }))
)
const outcomeOptions = computed(() =>
  (store.currentIR?.expression.outcomeIds ?? []).map(id => ({
    title: store.cohortNameById.get(id) ?? `Cohort ${id}`,
    value: id,
  }))
)
const multiplierOptions = computed(() => RATE_MULTIPLIER_OPTIONS.map(m => ({ title: `× ${m.toLocaleString()}`, value: m })))

function rowFor(sourceKey: string) {
  return store.executionInfoBySourceKey[sourceKey] ?? null
}
function isRunning(sourceKey: string): boolean {
  const r = rowFor(sourceKey)
  if (!r) return false
  return !IR_TERMINAL_STATUSES.has(r.executionInfo.status)
}
function matchingSummary(sourceKey: string) {
  const r = rowFor(sourceKey)
  if (!r) return undefined
  if (store.selectedTargetId == null || store.selectedOutcomeId == null) return r.summaryList[0]
  return r.summaryList.find(s =>
    s.targetId === store.selectedTargetId && s.outcomeId === store.selectedOutcomeId
  )
}
function formatNum(n?: number) { return n == null ? '—' : Math.round(n).toLocaleString() }
function toYears(days?: number) { return days == null ? undefined : days / 365.25 }
function formatRate(r?: number) {
  if (r == null) return '—'
  return (r * store.rateMultiplier).toFixed(2)
}

async function onGenerate(sourceKey: string) { await gen.start(sourceKey) }
async function onCancel(sourceKey: string) { await gen.cancel(sourceKey) }
</script>

<style scoped>
.gen-panel { display: flex; flex-direction: column; gap: 12px; padding: 8px; }
.filters { display: flex; gap: 12px; flex-wrap: wrap; }
.empty { text-align: center; color: #888; padding: 16px; }
</style>
