<template>
  <div class="char-per-analysis">
    <PrevalenceTable
      v-for="g in prevalenceGroups"
      :key="`prev-${g.analysisId}`"
      :analysis-id="g.analysisId"
      :analysis-name="g.analysisName"
      :rows="g.rows"
      :cohorts="g.cohorts"
      @explore="(row) => $emit('explore', row)"
    />
    <DistributionTable
      v-for="g in distributionGroups"
      :key="`dist-${g.analysisId}`"
      :analysis-id="g.analysisId"
      :analysis-name="g.analysisName"
      :rows="g.rows"
      :cohorts="g.cohorts"
    />
    <div
      v-if="prevalenceGroups.length === 0 && distributionGroups.length === 0"
      class="char-per-analysis__empty"
    >
      {{ tv('common.noData', 'No rows match the current filter.') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import PrevalenceTable from '@/components/characterization-results/PrevalenceTable.vue'
import DistributionTable from '@/components/characterization-results/DistributionTable.vue'
import { DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'
import type {
  DistributionStat, LinkedCohort, PrevalenceStat,
} from '@/models/characterization.types'

const props = defineProps<{
  prevalence: PrevalenceStat[]
  distribution: DistributionStat[]
  cohorts: LinkedCohort[]
  threshold: number
  selectedAnalysisIds: number[]
  selectedDomains: string[]
  selectedCohortId: number | null
}>()

defineEmits<{ explore: [row: PrevalenceStat] }>()
const { tv } = useI18n()

function pickStratumKey(rec: Record<string, Record<string, number>>): string | null {
  const keys = Object.keys(rec)
  if (keys.length === 0) return null
  return keys.includes(DEFAULT_STRATA_KEY) ? DEFAULT_STRATA_KEY : (keys[0] ?? null)
}

function passesThreshold(row: PrevalenceStat): boolean {
  if (props.threshold <= 0) return true
  const k = pickStratumKey(row.pct)
  if (!k) return false
  return Object.values(row.pct[k]!).some(v => typeof v === 'number' && v >= props.threshold)
}

function passesAnalysis(id: number) {
  return props.selectedAnalysisIds.length === 0 || props.selectedAnalysisIds.includes(id)
}
function passesDomain(domain?: string) {
  return props.selectedDomains.length === 0 || (!!domain && props.selectedDomains.includes(domain))
}
function filterCohorts(list: LinkedCohort[]): LinkedCohort[] {
  if (props.selectedCohortId === null) return list
  const f = list.filter(c => c.id === props.selectedCohortId)
  return f.length ? f : list
}

interface Group<R> { analysisId: number; analysisName: string; cohorts: LinkedCohort[]; rows: R[] }

const prevalenceGroups = computed<Group<PrevalenceStat>[]>(() => {
  const groups = new Map<number, Group<PrevalenceStat>>()
  for (const row of props.prevalence) {
    if (!passesAnalysis(row.analysisId)) continue
    if (!passesDomain(row.domainId)) continue
    if (!passesThreshold(row)) continue
    let g = groups.get(row.analysisId)
    if (!g) {
      g = { analysisId: row.analysisId, analysisName: row.analysisName,
            cohorts: filterCohorts(row.cohorts), rows: [] }
      groups.set(row.analysisId, g)
    }
    g.rows.push(row)
  }
  return Array.from(groups.values())
})

const distributionGroups = computed<Group<DistributionStat>[]>(() => {
  const groups = new Map<number, Group<DistributionStat>>()
  for (const row of props.distribution) {
    if (!passesAnalysis(row.analysisId)) continue
    if (!passesDomain(row.domainId)) continue
    let g = groups.get(row.analysisId)
    if (!g) {
      g = { analysisId: row.analysisId, analysisName: row.analysisName,
            cohorts: filterCohorts(row.cohorts), rows: [] }
      groups.set(row.analysisId, g)
    }
    g.rows.push(row)
  }
  return Array.from(groups.values())
})
</script>

<style scoped>
.char-per-analysis { display: flex; flex-direction: column; gap: 16px; }
.char-per-analysis__empty {
  padding: 32px; text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6); font-size: 13px;
}
</style>
