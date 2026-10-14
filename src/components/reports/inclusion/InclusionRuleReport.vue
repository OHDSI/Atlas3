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
        {{ t('cohortDefinitions.cohortreports.tabs.byPerson').value }}
      </AtlasTab>
      <AtlasTab
        :value="0"
        data-testid="inclusion-mode-by-event"
      >
        {{ t('cohortDefinitions.cohortreports.tabs.byEvent').value }}
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
      v-else-if="report && !hasStatistics"
      severity="info"
      data-testid="inclusion-rule-report-no-stats"
    >
      {{
        t('components.inclusionRuleReport.noStatsRecorded').value
      }}
    </AtlasAlert>

    <AtlasAlert
      v-else-if="!report"
      severity="info"
      data-testid="inclusion-rule-report-empty"
    >
      {{
        t('components.inclusionRuleReport.noReportData').value
      }}
    </AtlasAlert>

    <template v-else>
      <!-- Summary stats -->
      <div class="inclusion-rule-report__summary">
        <SummaryStat
          :label="t('components.inclusionRuleReport.matchRate').value"
          :value="formatPercent(report.summary.percentMatched)"
          data-testid="inclusion-summary-match-rate"
        />
        <SummaryStat
          :label="t('components.inclusionRuleReport.matches').value"
          :value="formatCount(report.summary.finalCount)"
          data-testid="inclusion-summary-final-count"
        />
        <SummaryStat
          :label="t('components.inclusionRuleReport.lost').value"
          :value="formatCount(report.summary.lostCount)"
          data-testid="inclusion-summary-lost-count"
        />
        <SummaryStat
          :label="t('components.inclusionRuleReport.totalEvents').value"
          :value="formatCount(report.summary.baseCount)"
          data-testid="inclusion-summary-base-count"
        />
      </div>

      <!-- Attrition / Intersect, as in Atlas 2; only meaningful once there are rules -->
      <AtlasTabs
        v-if="report.inclusionRuleStats.length > 0"
        v-model="view"
        density="compact"
        color="primary"
        class="inclusion-rule-report__view mt-4"
        data-testid="inclusion-view"
      >
        <AtlasTab
          value="attrition"
          data-testid="inclusion-view-attrition"
        >
          {{ t('components.inclusionRuleReport.attritionView').value }}
        </AtlasTab>
        <AtlasTab
          value="intersect"
          data-testid="inclusion-view-intersect"
        >
          {{ t('components.inclusionRuleReport.intersectView').value }}
        </AtlasTab>
      </AtlasTabs>

      <template v-if="view === 'attrition' || report.inclusionRuleStats.length === 0">
        <!-- Attrition funnel (cumulative — lazy-loaded) -->
        <section class="mt-6">
          <h3 class="text-subtitle-1 font-weight-medium mb-2">
            {{ t('components.inclusionRuleReport.attritionFunnel').value }}
          </h3>
          <AtlasTextField
            :model-value="customInitialLabel"
            class="inclusion-rule-report__initial-label mb-3"
            :label="t('components.inclusionRuleReport.initialPopulationLabel').value"
            :placeholder="defaultInitialLabel"
            :hint="t('components.inclusionRuleReport.initialPopulationLabelHint').value"
            persistent-hint
            persistent-placeholder
            data-testid="inclusion-initial-label"
            @update:model-value="setInitialLabel(String($event ?? ''))"
          />
          <InclusionRuleAttritionFunnel
            :report="report"
            :initial-label="initialLabel"
          />
        </section>

        <!-- Per-rule satisfaction table -->
        <section class="mt-6">
          <h3 class="text-subtitle-1 font-weight-medium mb-2">
            {{ t('components.inclusionRuleReport.perRuleSatisfaction').value }}
          </h3>
          <InclusionRuleAttritionTable
            :rules="report.inclusionRuleStats"
            :cumulative-remaining="cumulativeRemaining"
            :base-count="report.summary.baseCount"
            :initial-label="initialLabel"
          />
        </section>
      </template>

      <!-- Intersect view (Atlas 2 parity): who passed / failed all / any of the checked rules -->
      <section
        v-else
        class="mt-4 inclusion-rule-report__intersect"
        data-testid="inclusion-intersect"
      >
        <div class="inclusion-rule-report__intersect-rules">
          <p
            class="inclusion-rule-report__intersect-sentence"
            data-testid="inclusion-intersect-sentence"
          >
            {{ t('components.inclusionRuleReport.intersectHaving').value }}
            <InclusionChoiceMenu
              v-model="intersectMode"
              :items="intersectModeItems"
              :label="t('components.inclusionRuleReport.intersectModeLabel').value"
              testid="inclusion-intersect-mode"
            />
            {{ t('components.inclusionRuleReport.intersectOfSelected').value }}
            <InclusionChoiceMenu
              v-model="intersectOutcome"
              :items="intersectOutcomeItems"
              :label="t('components.inclusionRuleReport.intersectOutcome').value"
              testid="inclusion-intersect-outcome"
            />
          </p>
          <InclusionRuleIntersectTable
            v-model:selected="selectedRules"
            :rules="report.inclusionRuleStats"
            :hover-bits="hoveredLeaf?.bits ?? null"
          />
          <p
            class="inclusion-rule-report__intersect-result"
            data-testid="inclusion-intersect-result"
          >
            <template v-if="intersectCount === null">
              {{ t('components.inclusionRuleReport.intersectUnavailable').value }}
            </template>
            <template v-else-if="selectedRules.length === 0">
              {{ t('components.inclusionRuleReport.intersectNoneSelected').value }}
            </template>
            <template v-else>
              <strong>{{ formatCount(intersectCount) }}</strong>
              {{ intersectResultText }}
            </template>
          </p>
        </div>

        <!-- Population visualization: hover a box to see which rules it passed -->
        <div class="inclusion-rule-report__intersect-viz">
          <h3 class="text-subtitle-1 font-weight-medium mb-1">
            {{ t('components.inclusionRuleReport.populationBreakdown').value }}
          </h3>
          <p
            class="inclusion-rule-report__hover-summary"
            data-testid="inclusion-hover-summary"
          >
            {{ hoverSummary }}
          </p>
          <InclusionRuleTreemap
            :treemap="report.treemap"
            :rule-count="report.inclusionRuleStats.length"
            :rule-names="report.inclusionRuleStats.map(r => r.name)"
            :base-count="report.summary.baseCount"
            :selection="intersectSelection"
            :unit-label="isEventMode
              ? t('components.inclusionRuleReport.unitEvents').value
              : t('components.inclusionRuleReport.unitPersons').value"
            @leaf-hover="hoveredLeaf = $event"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  AtlasAlert,
  AtlasSkeleton,
  AtlasTab,
  AtlasTabs,
  AtlasTextField,
} from '@/components/ui'
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { getInclusionRuleReport } from '@/services/report.service'
import type { InclusionRuleReport, InclusionRuleReportMode } from '@/models/report.types'
import {
  computeAttritionSteps,
  computeIntersectCount,
  type IntersectMode,
  type IntersectOutcome,
  type IntersectSelection,
} from '@/utils/inclusion-attrition'
import { useI18n } from '@/composables/useI18n'
import { useInitialPopulationLabel } from '@/composables/useInitialPopulationLabel'
import InclusionChoiceMenu from './InclusionChoiceMenu.vue'
import InclusionRuleAttritionTable from './InclusionRuleAttritionTable.vue'
import InclusionRuleIntersectTable from './InclusionRuleIntersectTable.vue'
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

const { t, tv } = useI18n()

const mode = ref<InclusionRuleReportMode>(1)
const view = ref<'attrition' | 'intersect'>('attrition')
const report = ref<InclusionRuleReport | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// WebAPI hands back a default Summary, every count zero and percentMatched
// unset, when the results schema holds no cohort_summary_stats row for this
// cohort and mode. Its row mapper always fills percentMatched when a row does
// exist, and a genuinely empty cohort still reports "0.00%", so that null
// together with zeroed counts means "nothing was recorded" rather than
// "nothing matched". Rendering it as a report of zeros contradicted the
// generation panel's own record count (#299).
const hasStatistics = computed<boolean>(() => {
  const summary = report.value?.summary
  if (!summary) return false
  return (
    summary.percentMatched !== null ||
    summary.baseCount !== 0 ||
    summary.finalCount !== 0 ||
    summary.lostCount !== 0
  )
})

const { label: customInitialLabel, setLabel: setInitialLabel } = useInitialPopulationLabel(
  computed(() => props.cohortId)
)
const defaultInitialLabel = computed(() =>
  tv('components.inclusionRuleReport.initialPopulation')
)
const initialLabel = computed(() => customInitialLabel.value.trim() || defaultInitialLabel.value)

// By Event mode counts entry events, not people; the wording has to follow.
const isEventMode = computed(() => mode.value === 0)

const selectedRules = ref<number[]>([])
const intersectMode = ref<IntersectMode>('any')
const intersectOutcome = ref<IntersectOutcome>('passed')

// Atlas 2 defaults: every rule checked, "any" rule "passed". Reset whenever a
// report for a different cohort / source (or rule set) arrives, so one
// cohort's selection never carries into another. Switching the By Person /
// By Event tab keeps the selection, since the rules are the same.
watch(
  () => `${props.cohortId}|${props.sourceKey}|${report.value?.inclusionRuleStats.length ?? 0}`,
  () => {
    const count = report.value?.inclusionRuleStats.length ?? 0
    selectedRules.value = Array.from({ length: count }, (_, i) => i)
    intersectMode.value = 'any'
    intersectOutcome.value = 'passed'
  }
)

const intersectSelection = computed<IntersectSelection>(() => ({
  rules: selectedRules.value,
  mode: intersectMode.value,
  outcome: intersectOutcome.value,
}))

const intersectModeItems = computed(() => [
  { value: 'any' as const, title: tv('components.inclusionRuleReport.intersectAny') },
  { value: 'all' as const, title: tv('components.inclusionRuleReport.intersectAll') },
])
const intersectOutcomeItems = computed(() => [
  { value: 'passed' as const, title: tv('components.inclusionRuleReport.intersectPassed') },
  { value: 'failed' as const, title: tv('components.inclusionRuleReport.intersectFailed') },
])

// Treemap leaf under the pointer: drives the summary line and the pass / fail
// row highlight, as in Atlas 2.
const hoveredLeaf = ref<{ bits: string; size: number } | null>(null)

const hoverSummary = computed(() => {
  const leaf = hoveredLeaf.value
  if (!leaf) {
    return tv('components.inclusionRuleReport.hoverHint')
  }
  const base = report.value?.summary.baseCount ?? 0
  const passed = [...leaf.bits].filter(b => b === '1').length
  return tv(
    isEventMode.value ? 'components.inclusionRuleReport.hoverSummaryEvents' : 'components.inclusionRuleReport.hoverSummaryPersons',
    isEventMode.value
      ? '{size} events ({percent}), {passed} rules passed, {failed} rules failed'
      : '{size} persons ({percent}), {passed} rules passed, {failed} rules failed',
    {
      size: formatCount(leaf.size),
      percent: base > 0 ? `${((leaf.size / base) * 100).toFixed(2)}%` : '—',
      passed,
      failed: leaf.bits.length - passed,
    }
  )
})

const intersectCount = computed<number | null>(() =>
  report.value ? computeIntersectCount(report.value, intersectSelection.value) : null
)

const intersectResultText = computed(() => {
  const base = report.value?.summary.baseCount ?? 0
  const percent =
    intersectCount.value === null || base <= 0 ? '—' : `${((intersectCount.value / base) * 100).toFixed(2)}%`
  return isEventMode.value
    ? tv('components.inclusionRuleReport.intersectResultEvents', { percent })
    : tv('components.inclusionRuleReport.intersectResultPersons', { percent })
})

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
    const result = await getInclusionRuleReport(props.cohortId, props.sourceKey, mode.value)
    if (!result.success) {
      const prefix = tv('components.inclusionRuleReport.loadError')
      error.value = `${prefix}: ${result.error.message}`
      report.value = null
      return
    }
    // A rule saved without a name would show up as a blank row / funnel step
    report.value = {
      ...result.data,
      inclusionRuleStats: result.data.inclusionRuleStats.map(rule =>
        rule.name.trim()
          ? rule
          : {
              ...rule,
              name: tv('components.inclusionRuleReport.unnamedRule', { n: rule.id + 1 }),
            }
      ),
    }
  } catch (e) {
    const prefix = tv('components.inclusionRuleReport.loadError')
    error.value = e instanceof Error ? `${prefix}: ${e.message}` : `${prefix}.`
    report.value = null
  } finally {
    loading.value = false
  }
}

watch(() => [props.cohortId, props.sourceKey, mode.value] as const, load, { immediate: true })
watch([report, view], () => {
  hoveredLeaf.value = null
})

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
defineExpose({ mode, view, report, loading, error, hasStatistics, selectedRules, intersectMode, intersectOutcome, hoveredLeaf })
</script>

<style scoped>
.inclusion-rule-report__initial-label {
  max-width: 420px;
}
.inclusion-rule-report__intersect {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  gap: 24px;
  align-items: start;
}
@media (max-width: 960px) {
  .inclusion-rule-report__intersect {
    grid-template-columns: minmax(0, 1fr);
  }
}
.inclusion-rule-report__intersect-viz {
  padding-left: 24px;
  border-left: 1px solid var(--atlas-color-outline-variant);
}
@media (max-width: 960px) {
  .inclusion-rule-report__intersect-viz {
    padding-left: 0;
    border-left: 0;
  }
}
.inclusion-rule-report__intersect-sentence {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}
.inclusion-rule-report__hover-summary {
  min-height: 20px;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--atlas-color-on-surface-variant);
}
.inclusion-rule-report__intersect-result {
  margin-top: 12px;
  font-size: 14px;
  color: var(--atlas-color-on-surface-variant);
}
.inclusion-rule-report__intersect-result strong {
  color: var(--atlas-color-on-surface);
  font-variant-numeric: tabular-nums;
}
.inclusion-rule-report__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
</style>
