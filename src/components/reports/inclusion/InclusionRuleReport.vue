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
        {{ t('cohortDefinitions.cohortreports.tabs.byPerson', 'By Person').value }}
      </AtlasTab>
      <AtlasTab
        :value="0"
        data-testid="inclusion-mode-by-event"
      >
        {{ t('cohortDefinitions.cohortreports.tabs.byEvent', 'By Event').value }}
      </AtlasTab>
    </AtlasTabs>

    <AtlasRadioGroup
      v-model="view"
      inline
      class="inclusion-rule-report__view mb-3"
      :label="t('components.inclusionRuleReport.view', 'View').value"
      data-testid="inclusion-view"
    >
      <AtlasRadio
        value="attrition"
        :label="t('components.inclusionRuleReport.attritionView', 'Attrition view').value"
        data-testid="inclusion-view-attrition"
      />
      <AtlasRadio
        value="intersect"
        :label="t('components.inclusionRuleReport.intersectView', 'Intersect view').value"
        data-testid="inclusion-view-intersect"
      />
    </AtlasRadioGroup>

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
        t(
          'components.inclusionRuleReport.noStatsRecorded',
          'This generation recorded no inclusion statistics for this mode, so there is no attrition to report. The cohort itself may still contain records; see the generation panel for its record count.'
        ).value
      }}
    </AtlasAlert>

    <AtlasAlert
      v-else-if="!report"
      severity="info"
      data-testid="inclusion-rule-report-empty"
    >
      {{
        t(
          'components.inclusionRuleReport.noReportData',
          "No inclusion-rule report data is available for this cohort and source. The cohort may have no inclusion rules, or it may not have been generated yet. If you've generated it already, try re-running."
        ).value
      }}
    </AtlasAlert>

    <template v-else>
      <!-- Summary stats -->
      <div class="inclusion-rule-report__summary">
        <SummaryStat
          :label="t('components.inclusionRuleReport.matchRate', 'Match rate').value"
          :value="formatPercent(report.summary.percentMatched)"
          data-testid="inclusion-summary-match-rate"
        />
        <SummaryStat
          :label="t('components.inclusionRuleReport.matches', 'Matches').value"
          :value="formatCount(report.summary.finalCount)"
          data-testid="inclusion-summary-final-count"
        />
        <SummaryStat
          :label="t('components.inclusionRuleReport.lost', 'Lost').value"
          :value="formatCount(report.summary.lostCount)"
          data-testid="inclusion-summary-lost-count"
        />
        <SummaryStat
          :label="t('components.inclusionRuleReport.totalEvents', 'Total events').value"
          :value="formatCount(report.summary.baseCount)"
          data-testid="inclusion-summary-base-count"
        />
      </div>

      <template v-if="view === 'attrition'">
        <!-- Attrition funnel (cumulative — lazy-loaded) -->
        <section class="mt-6">
          <h3 class="text-subtitle-1 font-weight-medium mb-2">
            {{ t('components.inclusionRuleReport.attritionFunnel', 'Attrition funnel').value }}
          </h3>
          <AtlasTextField
            :model-value="customInitialLabel"
            class="inclusion-rule-report__initial-label mb-3"
            :label="t('components.inclusionRuleReport.initialPopulationLabel', 'Initial population label').value"
            :placeholder="defaultInitialLabel"
            :hint="t('components.inclusionRuleReport.initialPopulationLabelHint', 'Shown in the funnel, table and CSV. Saved in this browser only.').value"
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
            {{ t('components.inclusionRuleReport.perRuleSatisfaction', 'Per-rule satisfaction').value }}
          </h3>
          <InclusionRuleAttritionTable
            :rules="report.inclusionRuleStats"
            :cumulative-remaining="cumulativeRemaining"
            :base-count="report.summary.baseCount"
            :initial-label="initialLabel"
          />
        </section>
      </template>

      <!-- Intersect view (Atlas 2 parity): who satisfies all / any of the checked rules -->
      <section
        v-else
        class="mt-6 inclusion-rule-report__intersect"
        data-testid="inclusion-intersect"
      >
        <h3 class="text-subtitle-1 font-weight-medium mb-2">
          {{ t('components.inclusionRuleReport.intersectTitle', 'Rule intersection').value }}
        </h3>
        <AtlasRadioGroup
          v-model="intersectMode"
          inline
          :label="t('components.inclusionRuleReport.intersectMatch', 'Persons satisfying').value"
          data-testid="inclusion-intersect-mode"
        >
          <AtlasRadio
            value="all"
            :label="t('components.inclusionRuleReport.intersectAll', 'All selected rules').value"
            data-testid="inclusion-intersect-mode-all"
          />
          <AtlasRadio
            value="any"
            :label="t('components.inclusionRuleReport.intersectAny', 'Any selected rule').value"
            data-testid="inclusion-intersect-mode-any"
          />
        </AtlasRadioGroup>
        <div class="inclusion-rule-report__intersect-rules">
          <AtlasCheckbox
            v-for="(rule, idx) in report.inclusionRuleStats"
            :key="rule.id"
            :model-value="selectedRules.includes(idx)"
            :label="`${idx + 1}. ${rule.name}`"
            :data-testid="`inclusion-intersect-rule-${idx}`"
            @update:model-value="toggleRule(idx, $event)"
          />
        </div>
        <p
          class="inclusion-rule-report__intersect-result"
          data-testid="inclusion-intersect-result"
        >
          <template v-if="intersectCount !== null">
            <strong>{{ formatCount(intersectCount) }}</strong>
            {{
              tv('components.inclusionRuleReport.intersectResult', 'persons ({percent} of initial population)', {
                percent: intersectPercent,
              })
            }}
          </template>
          <template v-else>
            {{ t('components.inclusionRuleReport.intersectUnavailable', 'No population breakdown is available to intersect.').value }}
          </template>
        </p>
      </section>

      <!-- Treemap -->
      <section class="mt-6">
        <h3 class="text-subtitle-1 font-weight-medium mb-2">
          {{ t('components.inclusionRuleReport.populationBreakdown', 'Population breakdown').value }}
        </h3>
        <InclusionRuleTreemap
          :treemap="report.treemap"
          :rule-count="report.inclusionRuleStats.length"
          :rule-names="report.inclusionRuleStats.map(r => r.name)"
          :selection="view === 'intersect' ? { rules: selectedRules, mode: intersectMode } : null"
        />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  AtlasAlert,
  AtlasCheckbox,
  AtlasRadio,
  AtlasRadioGroup,
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
} from '@/utils/inclusion-attrition'
import { useI18n } from '@/composables/useI18n'
import { useInitialPopulationLabel } from '@/composables/useInitialPopulationLabel'
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
  tv('components.inclusionRuleReport.initialPopulation', 'Initial population')
)
const initialLabel = computed(() => customInitialLabel.value.trim() || defaultInitialLabel.value)

const selectedRules = ref<number[]>([])
const intersectMode = ref<IntersectMode>('all')

// Start each report with every rule checked, which reproduces the final count.
watch(
  () => report.value?.inclusionRuleStats.length ?? 0,
  count => {
    selectedRules.value = Array.from({ length: count }, (_, i) => i)
  }
)

function toggleRule(idx: number, checked: boolean) {
  selectedRules.value = checked
    ? [...selectedRules.value, idx].sort((a, b) => a - b)
    : selectedRules.value.filter(i => i !== idx)
}

const intersectCount = computed<number | null>(() =>
  report.value ? computeIntersectCount(report.value, selectedRules.value, intersectMode.value) : null
)

const intersectPercent = computed(() => {
  const base = report.value?.summary.baseCount ?? 0
  if (intersectCount.value === null || base <= 0) return '—'
  return `${((intersectCount.value / base) * 100).toFixed(2)}%`
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
      const prefix = tv('components.inclusionRuleReport.loadError', 'Failed to load the inclusion-rule report')
      error.value = `${prefix}: ${result.error.message}`
      report.value = null
      return
    }
    report.value = result.data
  } catch (e) {
    const prefix = tv('components.inclusionRuleReport.loadError', 'Failed to load the inclusion-rule report')
    error.value = e instanceof Error ? `${prefix}: ${e.message}` : `${prefix}.`
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
defineExpose({ mode, view, report, loading, error, hasStatistics, selectedRules, intersectMode })
</script>

<style scoped>
.inclusion-rule-report__initial-label {
  max-width: 420px;
}
.inclusion-rule-report__intersect-rules {
  display: flex;
  flex-direction: column;
  margin: 4px 0 8px;
}
.inclusion-rule-report__intersect-result {
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
