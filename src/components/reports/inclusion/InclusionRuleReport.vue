<template>
  <div
    class="inclusion-rule-report"
    data-testid="inclusion-rule-report"
  >
    <!-- Mode tabs (mirrors Atlas 2.15 By-Person / By-Event tabs) -->
    <v-tabs
      v-model="mode"
      density="compact"
      color="primary"
      class="inclusion-rule-report__tabs mb-3"
    >
      <v-tab
        :value="1"
        data-testid="inclusion-mode-by-person"
      >
        By Person
      </v-tab>
      <v-tab
        :value="0"
        data-testid="inclusion-mode-by-event"
      >
        By Event
      </v-tab>
    </v-tabs>

    <!-- Loading -->
    <div
      v-if="loading"
      class="py-6"
    >
      <v-skeleton-loader type="table-tbody" />
    </div>

    <!-- Error -->
    <v-alert
      v-else-if="error"
      type="error"
      variant="tonal"
      data-testid="inclusion-rule-report-error"
    >
      {{ error }}
    </v-alert>

    <!-- Empty (no generation yet) -->
    <v-alert
      v-else-if="!report"
      type="info"
      variant="tonal"
      data-testid="inclusion-rule-report-empty"
    >
      No generation results found for this cohort and source. Generate the cohort first.
    </v-alert>

    <template v-else>
      <!-- Summary stats -->
      <div class="inclusion-rule-report__summary">
        <SummaryStat
          label="Match rate"
          :value="formatPercent(report.summary.percentMatched)"
          data-testid="inclusion-summary-match-rate"
        />
        <SummaryStat
          label="Matches"
          :value="formatCount(report.summary.finalCount)"
          data-testid="inclusion-summary-final-count"
        />
        <SummaryStat
          label="Lost"
          :value="formatCount(report.summary.lostCount)"
          data-testid="inclusion-summary-lost-count"
        />
        <SummaryStat
          label="Total events"
          :value="formatCount(report.summary.baseCount)"
          data-testid="inclusion-summary-base-count"
        />
      </div>

      <!-- Attrition table -->
      <section class="mt-6">
        <h3 class="text-subtitle-1 font-weight-medium mb-2">
          Attrition by inclusion rule
        </h3>
        <InclusionRuleAttritionTable :rules="report.inclusionRuleStats" />
      </section>

      <!-- Treemap -->
      <section class="mt-6">
        <h3 class="text-subtitle-1 font-weight-medium mb-2">
          Population breakdown
        </h3>
        <InclusionRuleTreemap
          :treemap="report.treemap"
          :rule-count="report.inclusionRuleStats.length"
        />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getInclusionRuleReport } from '@/services/webapi'
import type { InclusionRuleReport, InclusionRuleReportMode } from '@/models/report.types'
import InclusionRuleAttritionTable from './InclusionRuleAttritionTable.vue'
import InclusionRuleTreemap from './InclusionRuleTreemap.vue'
import SummaryStat from './SummaryStat.vue'

const props = defineProps<{
  cohortId: number
  sourceKey: string
}>()

const mode = ref<InclusionRuleReportMode>(1)
const report = ref<InclusionRuleReport | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  if (!props.cohortId || !props.sourceKey) return
  loading.value = true
  error.value = null
  try {
    report.value = await getInclusionRuleReport(props.cohortId, props.sourceKey, mode.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load report'
    report.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.cohortId, props.sourceKey, mode.value] as const,
  load,
  { immediate: true }
)

function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n)
}

function formatPercent(s: string | null): string {
  if (!s) return '—'
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? `${n.toFixed(2)}%` : s
}

// Re-export so ReportPanel's async-component loader gets the correct shape
defineOptions({ name: 'InclusionRuleReport' })

// Expose for tests
const _debug = computed(() => ({ mode: mode.value, hasReport: !!report.value }))
defineExpose({ _debug })
</script>

<style scoped>
.inclusion-rule-report__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
</style>
