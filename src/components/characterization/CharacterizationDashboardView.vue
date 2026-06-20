<template>
  <div class="char-dashboard">
    <section
      v-if="boxPlotGroups.length > 0"
      class="char-dashboard__section"
    >
      <h3 class="char-dashboard__heading">
        Distributions
      </h3>
      <div class="char-dashboard__grid">
        <AtlasCard
          v-for="g in boxPlotGroups"
          :key="g.label"
          padding="sm"
        >
          <div class="char-dashboard__chart-title">
            {{ g.label }}
          </div>
          <BoxPlotChart
            :data="g.data"
            :height="280"
            :show-export="false"
          />
        </AtlasCard>
      </div>
    </section>

    <section
      v-if="genderGroup || ageGroupData.length > 0 || otherDemographicGroups.length > 0"
      class="char-dashboard__section"
    >
      <h3 class="char-dashboard__heading">
        Demographic Profile
      </h3>
      <AtlasCard
        v-if="genderGroup"
        padding="sm"
      >
        <div class="char-dashboard__chart-title">
          Gender
        </div>
        <v-chart
          :option="demographicBarOption(genderGroup)"
          :style="{ height: '200px', width: '100%' }"
          autoresize
        />
      </AtlasCard>
      <AtlasCard
        v-if="ageGroupData.length > 0"
        padding="sm"
      >
        <div class="char-dashboard__chart-title">
          Age Distribution
        </div>
        <v-chart
          :option="ageGroupOption"
          :style="{ height: ageGroupHeight + 'px', width: '100%' }"
          autoresize
        />
      </AtlasCard>
      <div
        v-if="otherDemographicGroups.length > 0"
        class="char-dashboard__grid"
      >
        <AtlasCard
          v-for="g in otherDemographicGroups"
          :key="g.analysisName"
          padding="sm"
        >
          <div class="char-dashboard__chart-title">
            {{ g.analysisName }}
          </div>
          <v-chart
            :option="demographicBarOption(g)"
            :style="{ height: '280px', width: '100%' }"
            autoresize
          />
        </AtlasCard>
      </div>
    </section>

    <section
      v-if="isTwoCohort && scatterPoints.length > 0"
      class="char-dashboard__section"
    >
      <h3 class="char-dashboard__heading">
        Prevalence Comparison
      </h3>
      <AtlasCard padding="sm">
        <div class="char-dashboard__chart-title">
          {{ cohorts[0]?.name }} vs {{ cohorts[1]?.name }}
        </div>
        <v-chart
          :option="scatterOption"
          :style="{ height: '450px', width: '100%' }"
          autoresize
        />
      </AtlasCard>
    </section>

    <section
      v-if="isTwoCohort && smdPoints.length > 0"
      class="char-dashboard__section"
    >
      <h3 class="char-dashboard__heading">
        Covariate Balance (Std. Mean Difference)
      </h3>
      <AtlasCard padding="sm">
        <div class="char-dashboard__chart-subtitle">
          Covariates with |SMD| > 0.1 (dashed lines) are considered imbalanced
        </div>
        <v-chart
          :option="smdOption"
          :style="{ height: smdChartHeight + 'px', width: '100%' }"
          autoresize
        />
      </AtlasCard>
    </section>

    <section
      v-if="!isTwoCohort && topPrevalence.length > 0"
      class="char-dashboard__section"
    >
      <h3 class="char-dashboard__heading">
        Top Covariates by Prevalence
      </h3>
      <AtlasCard padding="sm">
        <v-chart
          :option="topBarOption"
          :style="{ height: topBarHeight + 'px', width: '100%' }"
          autoresize
        />
      </AtlasCard>
    </section>

    <div
      v-if="boxPlotGroups.length === 0 && scatterPoints.length === 0 && topPrevalence.length === 0"
      class="char-dashboard__empty"
    >
      No data available for visualization.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { AtlasCard } from '@/components/ui'
import BoxPlotChart from '@/components/ui/charts/AtlasBoxPlotChart.vue'
import type { BoxPlotData } from '@/models/report.types'
import type { DistributionStat, LinkedCohort, PrevalenceStat } from '@/models/characterization.types'
import { DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'

const props = defineProps<{
  prevalence: PrevalenceStat[]
  distribution: DistributionStat[]
  cohorts: LinkedCohort[]
}>()

const isTwoCohort = computed(() => props.cohorts.length === 2)

function pickStratum(rec: Record<string, Record<string, number>>): Record<string, number> | null {
  const keys = Object.keys(rec)
  if (keys.length === 0) return null
  const k = keys.includes(DEFAULT_STRATA_KEY) ? DEFAULT_STRATA_KEY : keys[0]!
  return rec[k] ?? null
}

// ── Section 1: Distribution box plots ──

interface BoxPlotGroup {
  label: string
  data: BoxPlotData[]
}

const boxPlotGroups = computed<BoxPlotGroup[]>(() =>
  props.distribution.map(dist => {
    const data: BoxPlotData[] = []
    for (const cohort of props.cohorts) {
      const id = String(cohort.id)
      const minMap = pickStratum(dist.min)
      const p25Map = pickStratum(dist.p25)
      const medMap = pickStratum(dist.median)
      const p75Map = pickStratum(dist.p75)
      const maxMap = pickStratum(dist.max)
      const p10Map = pickStratum(dist.p10)
      const p90Map = pickStratum(dist.p90)
      if (medMap?.[id] != null) {
        data.push({
          category: cohort.name,
          min: minMap?.[id] ?? 0,
          p10: p10Map?.[id] ?? 0,
          p25: p25Map?.[id] ?? 0,
          median: medMap[id]!,
          p75: p75Map?.[id] ?? 0,
          p90: p90Map?.[id] ?? 0,
          max: maxMap?.[id] ?? 0,
        })
      }
    }
    return { label: dist.covariateName, data }
  }).filter(g => g.data.length > 0)
)

// ── Section 2: Demographic profile ──

interface DemographicGroup {
  analysisName: string
  covariates: { name: string; pcts: Record<string, number> }[]
}

const genderGroup = computed<DemographicGroup | null>(() => {
  const rows = props.prevalence.filter(r => r.analysisName.toLowerCase().includes('gender'))
  if (rows.length === 0) return null
  const covariates: DemographicGroup['covariates'] = []
  for (const row of rows) {
    const pctMap = pickStratum(row.pct)
    if (!pctMap) continue
    const pcts: Record<string, number> = {}
    for (const c of props.cohorts) pcts[c.name] = pctMap[String(c.id)] ?? 0
    covariates.push({ name: row.covariateName, pcts })
  }
  return covariates.length > 0 ? { analysisName: 'Gender', covariates } : null
})

interface AgeGroupRow { name: string; pcts: Record<string, number> }

const ageGroupData = computed<AgeGroupRow[]>(() => {
  const rows = props.prevalence.filter(r => r.analysisName.toLowerCase().includes('age group'))
  if (rows.length === 0) return []
  return rows.map(r => {
    const pctMap = pickStratum(r.pct)
    const pcts: Record<string, number> = {}
    for (const c of props.cohorts) pcts[c.name] = pctMap?.[String(c.id)] ?? 0
    return { name: r.covariateName, pcts }
  }).sort((a, b) => {
    const na = parseInt(a.name) || 0
    const nb = parseInt(b.name) || 0
    return na - nb
  })
})

const ageGroupHeight = computed(() => Math.max(250, ageGroupData.value.length * 28 + 60))

const COHORT_COLORS = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f']

const ageGroupOption = computed(() => {
  const categories = ageGroupData.value.map(r => r.name)
  const series = props.cohorts.map((cohort, i) => ({
    name: cohort.name,
    type: 'bar' as const,
    data: ageGroupData.value.map(r => r.pcts[cohort.name] ?? 0),
    itemStyle: { color: COHORT_COLORS[i % COHORT_COLORS.length] },
    barMaxWidth: 16,
  }))
  return {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    legend: { top: 0, type: 'scroll' as const },
    grid: { top: 35, right: 20, bottom: 30, left: 100 },
    xAxis: { type: 'value' as const, axisLabel: { formatter: '{value}%' } },
    yAxis: {
      type: 'category' as const,
      data: categories,
      axisLabel: { fontSize: 11 },
    },
    series,
  }
})

const OTHER_DEMO_KEYWORDS = ['race', 'ethnicity']

const otherDemographicGroups = computed<DemographicGroup[]>(() => {
  const groups = new Map<string, DemographicGroup>()
  for (const row of props.prevalence) {
    const lower = row.analysisName.toLowerCase()
    if (!OTHER_DEMO_KEYWORDS.some(k => lower.includes(k))) continue
    let g = groups.get(row.analysisName)
    if (!g) {
      g = { analysisName: row.analysisName, covariates: [] }
      groups.set(row.analysisName, g)
    }
    const pctMap = pickStratum(row.pct)
    if (!pctMap) continue
    const pcts: Record<string, number> = {}
    for (const c of props.cohorts) pcts[c.name] = pctMap[String(c.id)] ?? 0
    g.covariates.push({ name: row.covariateName, pcts })
  }
  return Array.from(groups.values()).filter(g => g.covariates.length > 0)
})

function demographicBarOption(group: DemographicGroup) {
  const categories = group.covariates.map(c => c.name)
  const series = props.cohorts.map((cohort, i) => ({
    name: cohort.name,
    type: 'bar' as const,
    data: group.covariates.map(c => c.pcts[cohort.name] ?? 0),
    itemStyle: { color: COHORT_COLORS[i % COHORT_COLORS.length] },
    barMaxWidth: 20,
  }))
  return {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    legend: { top: 0, type: 'scroll' as const },
    grid: { top: 35, right: 10, bottom: 30, left: 120 },
    xAxis: { type: 'value' as const, axisLabel: { formatter: '{value}%' } },
    yAxis: {
      type: 'category' as const,
      data: categories,
      axisLabel: { fontSize: 10, width: 100, overflow: 'truncate' as const },
    },
    series,
  }
}

// ── Section 3: Prevalence scatter plot (2-cohort) ──

const DOMAIN_COLORS: Record<string, string> = {
  CONDITION: '#4e79a7',
  DRUG: '#f28e2b',
  PROCEDURE: '#e15759',
  MEASUREMENT: '#76b7b2',
  OBSERVATION: '#59a14f',
  DEMOGRAPHICS: '#9c755f',
  DEVICE: '#edc948',
  VISIT: '#b07aa1',
}

interface ScatterPoint {
  name: string
  domain: string
  x: number
  y: number
}

const scatterPoints = computed<ScatterPoint[]>(() => {
  if (!isTwoCohort.value) return []
  const c1 = String(props.cohorts[0]!.id)
  const c2 = String(props.cohorts[1]!.id)
  const points: ScatterPoint[] = []
  for (const row of props.prevalence) {
    const pctMap = pickStratum(row.pct)
    if (!pctMap) continue
    const x = pctMap[c1]
    const y = pctMap[c2]
    if (x != null && y != null) {
      points.push({
        name: row.covariateName,
        domain: row.domainId ?? 'Other',
        x,
        y,
      })
    }
  }
  return points
})

const scatterOption = computed(() => {
  const domains = [...new Set(scatterPoints.value.map(p => p.domain))]
  const series = domains.map(domain => ({
    name: domain,
    type: 'scatter' as const,
    data: scatterPoints.value
      .filter(p => p.domain === domain)
      .map(p => [p.x, p.y, p.name]),
    symbolSize: 6,
    itemStyle: { color: DOMAIN_COLORS[domain] ?? '#999', opacity: 0.8 },
  }))

  const maxVal = Math.max(
    ...scatterPoints.value.map(p => Math.max(p.x, p.y)),
    1
  )
  const axisMax = Math.ceil(maxVal * 1.1)

  return {
    tooltip: {
      trigger: 'item' as const,
      formatter: (p: { data: [number, number, string] }) =>
        `<strong>${p.data[2]}</strong><br/>${props.cohorts[0]?.name}: ${p.data[0].toFixed(2)}%<br/>${props.cohorts[1]?.name}: ${p.data[1].toFixed(2)}%`,
    },
    legend: { top: 0, type: 'scroll' as const },
    grid: { top: 40, right: 20, bottom: 50, left: 60 },
    xAxis: {
      name: props.cohorts[0]?.name ?? 'Cohort 1',
      nameLocation: 'center' as const,
      nameGap: 35,
      type: 'value' as const,
      min: 0,
      max: axisMax,
      axisLabel: { formatter: '{value}%' },
    },
    yAxis: {
      name: props.cohorts[1]?.name ?? 'Cohort 2',
      nameLocation: 'center' as const,
      nameGap: 45,
      type: 'value' as const,
      min: 0,
      max: axisMax,
      axisLabel: { formatter: '{value}%' },
    },
    series: [
      ...series,
      {
        type: 'line' as const,
        data: [[0, 0], [axisMax, axisMax]],
        lineStyle: { type: 'dashed' as const, color: '#ccc', width: 1 },
        symbol: 'none',
        silent: true,
      },
    ],
  }
})

// ── Section 3: SMD love plot (2-cohort) ──

interface SMDPoint {
  name: string
  domain: string
  value: number
  imbalanced: boolean
}

const smdPoints = computed<SMDPoint[]>(() => {
  if (!isTwoCohort.value) return []
  return props.prevalence
    .filter(r => typeof r.stdDiff === 'number')
    .map(r => ({
      name: r.covariateName,
      domain: r.domainId ?? 'Other',
      value: r.stdDiff!,
      imbalanced: Math.abs(r.stdDiff!) >= 0.1,
    }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 30)
})

const smdChartHeight = computed(() => Math.max(300, smdPoints.value.length * 22 + 80))

const smdOption = computed(() => {
  const reversed = [...smdPoints.value].reverse()
  const names = reversed.map(p => p.name)
  const values = reversed.map(p => p.value)
  const colors = reversed.map(p =>
    p.imbalanced ? (DOMAIN_COLORS[p.domain] ?? '#e15759') : '#ccc'
  )

  return {
    tooltip: {
      trigger: 'item' as const,
      formatter: (p: { name: string; data: { value: [number, number] } }) => {
        const pt = reversed[p.data.value[1]]
        return `<strong>${pt?.name ?? ''}</strong><br/>Domain: ${pt?.domain ?? ''}<br/>SMD: ${p.data.value[0].toFixed(4)}`
      },
    },
    grid: { top: 20, right: 40, bottom: 40, left: 200 },
    xAxis: {
      type: 'value' as const,
      name: 'Standardised Mean Difference',
      nameLocation: 'center' as const,
      nameGap: 25,
    },
    yAxis: {
      type: 'category' as const,
      data: names,
      axisLabel: {
        fontSize: 10,
        width: 180,
        overflow: 'truncate' as const,
      },
    },
    series: [
      {
        type: 'scatter' as const,
        data: values.map((v, i) => ({
          value: [v, i],
          itemStyle: { color: colors[i] },
        })),
        symbolSize: 8,
      },
      {
        type: 'line' as const,
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed' as const, color: '#999' },
          data: [
            { xAxis: 0 },
            { xAxis: 0.1 },
            { xAxis: -0.1 },
          ],
          label: { show: false },
        },
        data: [],
      },
    ],
  }
})

// ── Single-cohort: top prevalence bar chart ──

interface TopPrev {
  name: string
  pct: number
}

const topPrevalence = computed<TopPrev[]>(() => {
  if (isTwoCohort.value || props.cohorts.length === 0) return []
  const cId = String(props.cohorts[0]!.id)
  return props.prevalence
    .map(r => {
      const pctMap = pickStratum(r.pct)
      return { name: r.covariateName, pct: pctMap?.[cId] ?? 0 }
    })
    .filter(r => r.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 20)
})

const topBarHeight = computed(() => Math.max(300, topPrevalence.value.length * 24 + 80))

const topBarOption = computed(() => {
  const names = topPrevalence.value.map(p => p.name).reverse()
  const values = topPrevalence.value.map(p => p.pct).reverse()
  return {
    tooltip: {
      trigger: 'item' as const,
      formatter: (p: { name: string; value: number }) => `${p.name}: ${p.value.toFixed(2)}%`,
    },
    grid: { top: 10, right: 40, bottom: 30, left: 200 },
    xAxis: {
      type: 'value' as const,
      axisLabel: { formatter: '{value}%' },
    },
    yAxis: {
      type: 'category' as const,
      data: names,
      axisLabel: { fontSize: 10, width: 180, overflow: 'truncate' as const },
    },
    series: [{
      type: 'bar' as const,
      data: values,
      itemStyle: { color: '#4e79a7' },
      barMaxWidth: 16,
    }],
  }
})
</script>

<style scoped>
.char-dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.char-dashboard__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.char-dashboard__heading {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  margin: 0;
}
.char-dashboard__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 12px;
}
.char-dashboard__chart-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-bottom: 4px;
}
.char-dashboard__chart-subtitle {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-style: italic;
  margin-bottom: 8px;
}
.char-dashboard__empty {
  padding: 48px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 13px;
}
</style>
