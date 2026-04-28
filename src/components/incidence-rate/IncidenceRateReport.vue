<template>
  <v-card
    variant="outlined"
    class="report"
  >
    <v-card-title>
      {{ t('ir.results.reports', 'Report') }}
      <v-spacer />
      <v-btn
        size="small"
        :disabled="!report"
        @click="onSvg"
      >
        {{ t('incidenceRate.exportSvg', 'SVG') }}
      </v-btn>
      <v-btn
        size="small"
        :disabled="!report"
        @click="onPng"
      >
        {{ t('incidenceRate.exportPng', 'PNG') }}
      </v-btn>
    </v-card-title>
    <v-card-text v-if="loading">
      {{ t('dataSources.loadingReport', 'Loading report…') }}
    </v-card-text>
    <v-card-text
      v-else-if="error"
      class="error"
    >
      {{ error }}
    </v-card-text>
    <v-card-text
      v-else-if="!report"
      class="muted"
    >
      {{ t('ir.results.selectTargetAndOutcomeAlert', 'Select source, target, and outcome to view report.') }}
    </v-card-text>
    <v-card-text v-else>
      <div class="row">
        <IncidenceRateTreemap
          ref="treemapRef"
          :treemap-json="report.treemapData"
          :width="600"
          :height="400"
        />
        <v-table
          density="compact"
          class="stats"
        >
          <thead>
            <tr>
              <th>{{ t('ir.results.summaryStatistics', 'Summary') }}</th><th />
            </tr>
          </thead>
          <tbody>
            <tr><td>{{ t('ir.results.persons', 'Persons') }}</td><td>{{ format(report.summary.totalPersons) }}</td></tr>
            <tr><td>{{ t('ir.results.cases', 'Cases') }}</td><td>{{ format(report.summary.cases) }}</td></tr>
            <tr><td>{{ t('common.days', 'TAR (days)') }}</td><td>{{ format(report.summary.timeAtRisk) }}</td></tr>
            <tr><td>{{ t('ir.results.proportion', 'Proportion') }}</td><td>{{ withMultiplier(report.summary.proportion) }}</td></tr>
            <tr><td>{{ t('ir.results.rate', 'Rate') }}</td><td>{{ withMultiplier(report.summary.rate) }}</td></tr>
          </tbody>
        </v-table>
      </div>
      <v-table
        v-if="report.stratifyStats.length"
        density="compact"
        class="mt-3"
      >
        <thead>
          <tr>
            <th>{{ t('ir.results.stratifyRule', 'Stratum') }}</th>
            <th>{{ t('ir.results.persons', 'Persons') }}</th>
            <th>{{ t('ir.results.cases', 'Cases') }}</th>
            <th>{{ t('common.days', 'TAR (days)') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in report.stratifyStats"
            :key="row.id"
          >
            <td>{{ row.name }}</td>
            <td>{{ format(row.totalPersons) }}</td>
            <td>{{ format(row.cases) }}</td>
            <td>{{ format(row.timeAtRisk) }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useIncidenceRateReport } from '@/composables/useIncidenceRateReport'
import IncidenceRateTreemap from '@/components/incidence-rate/IncidenceRateTreemap.vue'
import { downloadPNG, downloadSVG } from '@/utils/treemap-export'

const props = defineProps<{ irId: number }>()
const { t } = useI18n()
const store = useIncidenceRateStore()

const irIdRef = computed<number | null>(() => props.irId)
const sourceKey = computed(() => store.selectedSourceKey)
const targetId = computed(() => store.selectedTargetId)
const outcomeId = computed(() => store.selectedOutcomeId)
const { report, loading, error } = useIncidenceRateReport(irIdRef, sourceKey, targetId, outcomeId)

const treemapRef = ref<InstanceType<typeof IncidenceRateTreemap> | null>(null)

function format(n?: number) { return n == null ? '—' : Math.round(n).toLocaleString() }
function withMultiplier(n?: number) {
  if (n == null) return '—'
  return (n * store.rateMultiplier).toFixed(2)
}

function onSvg() {
  const svg = treemapRef.value?.svgRef
  if (svg) downloadSVG(svg, 'incidence-rate.svg')
}
async function onPng() {
  const svg = treemapRef.value?.svgRef
  if (svg) await downloadPNG(svg, 'incidence-rate.png')
}
</script>

<style scoped>
.report { margin-top: 12px; }
.row { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
.stats { min-width: 280px; }
.muted { color: #888; }
.error { color: #c00; }
</style>
