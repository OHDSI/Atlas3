<template>
  <div
    class="inclusion-rule-report"
    data-testid="inclusion-rule-report"
  >
    <!-- Mode tabs (mirrors Atlas 2.15 By-Person / By-Event tabs) -->
    <AtlasTabs
      v-model="mode"
      density="compact"
      color="primary"
      class="inclusion-rule-report__tabs mb-3"
    >
      <AtlasTab
        :value="1"
        data-testid="inclusion-mode-by-person"
      >
        By Person
      </AtlasTab>
      <AtlasTab
        :value="0"
        data-testid="inclusion-mode-by-event"
      >
        By Event
      </AtlasTab>
    </AtlasTabs>

    <!-- Loading -->
    <div
      v-if="loading"
      class="py-6"
    >
      <AtlasSkeleton type="table-tbody" />
    </div>

    <!-- Error -->
    <AtlasAlert
      v-else-if="error"
      severity="danger"
      data-testid="inclusion-rule-report-error"
    >
      {{ error }}
    </AtlasAlert>

    <AtlasAlert
      v-else-if="!report"
      severity="info"
      data-testid="inclusion-rule-report-empty"
    >
      No inclusion-rule report data is available for this cohort and source. The cohort may have no inclusion rules, or it may not have been generated yet. If you've generated it already, try re-running.
    </AtlasAlert>

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

      <!-- Attrition funnel (cumulative — lazy-loaded) -->
      <section class="mt-6">
        <h3 class="text-subtitle-1 font-weight-medium mb-2">
          Attrition funnel
        </h3>
        <InclusionRuleAttritionFunnel :report="report" />
      </section>

      <!-- Per-rule satisfaction table -->
      <section class="mt-6">
        <h3 class="text-subtitle-1 font-weight-medium mb-2">
          Per-rule satisfaction
        </h3>
        <InclusionRuleAttritionTable
          :rules="report.inclusionRuleStats"
          :cumulative-remaining="cumulativeRemaining"
        />
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
import { AtlasAlert, AtlasSkeleton, AtlasTab, AtlasTabs } from '@/components/ui'
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { getInclusionRuleReport } from '@/services/webapi'
import type { InclusionRuleReport, InclusionRuleReportMode } from '@/models/report.types'
import { computeAttritionSteps } from '@/utils/inclusion-attrition'
import InclusionRuleAttritionTable from './InclusionRuleAttritionTable.vue'
import InclusionRuleTreemap from './InclusionRuleTreemap.vue'
import SummaryStat from './SummaryStat.vue'

const InclusionRuleAttritionFunnel = defineAsyncComponent({
  loader: () => import('./InclusionRuleAttritionFunnel.vue'),
  loadingComponent: AtlasSkeleton,
  delay: 200,
})

const props = defineProps<{
  cohortId: number
  sourceKey: string
}>()

const mode = ref<InclusionRuleReportMode>(1)
const report = ref<InclusionRuleReport | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const cumulativeRemaining = computed<number[] | undefined>(() => {
  if (!report.value) return undefined
  // computeAttritionSteps returns [Initial, ...perRule]; drop the initial step
  return computeAttritionSteps(report.value).slice(1).map(s => s.remaining)
})

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

watch(() => [props.cohortId, props.sourceKey, mode.value] as const, load, { immediate: true })

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

// Expose internal refs so tests can drive the tab switch deterministically
defineExpose({ mode, report, loading, error })
</script>

<style scoped>
.inclusion-rule-report__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
</style>
