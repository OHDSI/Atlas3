<!--
  Characterization Results

  Phase 5 viewer. Loads the execution metadata, design snapshot, total
  result count, and result rows for a generation, then renders one card
  per (analysis, statType) pair with a prevalence/distribution table.
  Threshold filter, domain/analysis/cohort filters, and the explore
  dialog all run client-side; we deliberately do not re-fetch when the
  threshold changes (Atlas 2.15 supports server-side thresholding via
  the request body but the Phase 5 scope is local filtering).

  Temporal / annual views remain deferred.
-->
<template>
  <div class="page-wrapper">
    <div class="page-card">
      <v-container
        fluid
        class="char-results"
      >
        <!-- Toolbar -->
        <div class="char-results__toolbar">
          <div class="char-results__toolbar-left">
            <v-btn
              variant="text"
              prepend-icon="mdi-arrow-left"
              data-testid="char-results-back"
              @click="goBack"
            >
              {{ t('common.backToCurrent', 'Back to builder') }}
            </v-btn>
            <h1 class="char-results__title">
              {{ titleText }}
            </h1>
          </div>
          <div class="char-results__toolbar-right">
            <v-btn
              color="primary"
              variant="outlined"
              prepend-icon="mdi-download"
              :disabled="!hasAnyPrevalence"
              data-testid="char-results-export"
              @click="onExport"
            >
              {{ t('cc.viewEdit.results.exportAll', 'Export CSV') }}
            </v-btn>
          </div>
        </div>

        <!-- Loading -->
        <div
          v-if="loading"
          class="char-results__loading"
          data-testid="char-results-loading"
        >
          <v-progress-circular
            indeterminate
            size="48"
            color="primary"
          />
          <span class="ms-3">
            {{ t('cc.viewEdit.results.loading', 'Loading results...') }}
          </span>
        </div>

        <!-- Error -->
        <v-alert
          v-else-if="loadError"
          type="error"
          variant="tonal"
          class="mb-4"
          data-testid="char-results-error"
        >
          {{ loadError }}
        </v-alert>

        <template v-else>
          <ResultsHeader
            :execution="execution"
            :result-count="resultCount"
            :threshold="threshold"
            @update:threshold="threshold = $event"
          />

          <ResultsFilterPanel
            :available-analyses="availableAnalyses"
            :available-domains="availableDomains"
            :available-cohorts="availableCohorts"
            :selected-analysis-ids="selectedAnalysisIds"
            :selected-domains="selectedDomains"
            :selected-cohort-id="selectedCohortId"
            @update:selected-analysis-ids="selectedAnalysisIds = $event"
            @update:selected-domains="selectedDomains = $event"
            @update:selected-cohort-id="selectedCohortId = $event"
          />

          <div
            v-if="!filteredPrevalenceGroups.length && !filteredDistributionGroups.length"
            class="char-results__empty"
            data-testid="char-results-empty"
          >
            {{ t('common.noData', 'No rows match the current filter.') }}
          </div>

          <PrevalenceTable
            v-for="group in filteredPrevalenceGroups"
            :key="`prev-${group.analysisId}`"
            :analysis-id="group.analysisId"
            :analysis-name="group.analysisName"
            :rows="group.rows"
            :cohorts="group.cohorts"
            @explore="onExplore"
          />

          <DistributionTable
            v-for="group in filteredDistributionGroups"
            :key="`dist-${group.analysisId}`"
            :analysis-id="group.analysisId"
            :analysis-name="group.analysisName"
            :rows="group.rows"
            :cohorts="group.cohorts"
          />
        </template>

        <ExplorePrevalenceDialog
          v-model="exploreOpen"
          :generation-id="exploreGenerationId"
          :analysis-id="exploreAnalysisId"
          :cohort-id="exploreCohortId"
          :covariate-id="exploreCovariateId"
          :covariate-name="exploreCovariateName"
        />
      </v-container>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useI18n } from '@/composables/useI18n'
import {
  getCharacterization,
  getCharacterizationExecution,
  getCharacterizationResultCount,
  getCharacterizationResults,
} from '@/services/characterization.service'
import type {
  CharacterizationDefinition,
  CharacterizationExecution,
  DistributionStat,
  LinkedCohort,
  PrevalenceStat,
} from '@/models/characterization.types'
import {
  DEFAULT_STRATA_KEY,
  mapCharacterizationResults,
} from '@/utils/characterization-result-mapper'
import { arrayToCsv, downloadCsv } from '@/utils/csv'
import { logger } from '@/utils/logger'
import ResultsHeader from '@/components/characterization-results/ResultsHeader.vue'
import ResultsFilterPanel from '@/components/characterization-results/ResultsFilterPanel.vue'
import PrevalenceTable from '@/components/characterization-results/PrevalenceTable.vue'
import DistributionTable from '@/components/characterization-results/DistributionTable.vue'
import ExplorePrevalenceDialog from '@/components/characterization-results/ExplorePrevalenceDialog.vue'

interface Props {
  id: string
  executionId: string
}

const props = defineProps<Props>()
const router = useRouter()
const { t, tv } = useI18n()

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const loading = ref(true)
const loadError = ref<string | null>(null)

const characterization = ref<CharacterizationDefinition | null>(null)
const execution = ref<CharacterizationExecution | null>(null)
const resultCount = ref(0)
const prevalence = ref<PrevalenceStat[]>([])
const distribution = ref<DistributionStat[]>([])

// Filters / threshold
const threshold = ref(0)
const selectedAnalysisIds = ref<number[]>([])
const selectedDomains = ref<string[]>([])
const selectedCohortId = ref<number | null>(null)

// Explore dialog state
const exploreOpen = ref(false)
const exploreGenerationId = ref<number | null>(null)
const exploreAnalysisId = ref<number | null>(null)
const exploreCohortId = ref<number | null>(null)
const exploreCovariateId = ref<number | null>(null)
const exploreCovariateName = ref<string | null>(null)

// ---------------------------------------------------------------------------
// Derived
// ---------------------------------------------------------------------------

const characterizationId = computed<number | null>(() => {
  const parsed = Number.parseInt(props.id, 10)
  return Number.isFinite(parsed) ? parsed : null
})

const executionId = computed<number | null>(() => {
  const parsed = Number.parseInt(props.executionId, 10)
  return Number.isFinite(parsed) ? parsed : null
})

const titleText = computed<string>(() => {
  const name = characterization.value?.name
  const baseTitle = tv('cc.viewEdit.results.title', 'Results')
  return name ? `${baseTitle}: ${name}` : baseTitle
})

const availableAnalyses = computed<{ id: number; name: string }[]>(() => {
  const map = new Map<number, string>()
  for (const row of prevalence.value) {
    map.set(row.analysisId, row.analysisName)
  }
  for (const row of distribution.value) {
    map.set(row.analysisId, row.analysisName)
  }
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
})

const availableDomains = computed<string[]>(() => {
  const set = new Set<string>()
  for (const row of prevalence.value) {
    if (row.domainId) {
      set.add(row.domainId)
    }
  }
  for (const row of distribution.value) {
    if (row.domainId) {
      set.add(row.domainId)
    }
  }
  return Array.from(set).sort()
})

const availableCohorts = computed<LinkedCohort[]>(() => {
  const map = new Map<number, LinkedCohort>()
  for (const row of prevalence.value) {
    for (const c of row.cohorts) {
      if (!map.has(c.id)) {
        map.set(c.id, c)
      }
    }
  }
  for (const row of distribution.value) {
    for (const c of row.cohorts) {
      if (!map.has(c.id)) {
        map.set(c.id, c)
      }
    }
  }
  return Array.from(map.values())
})

function pickStratumKey(rec: Record<string, Record<string, number>>): string | null {
  const keys = Object.keys(rec)
  if (keys.length === 0) {
    return null
  }
  return keys.includes(DEFAULT_STRATA_KEY) ? DEFAULT_STRATA_KEY : (keys[0] as string)
}

function passesThreshold(row: PrevalenceStat): boolean {
  if (threshold.value <= 0) {
    return true
  }
  const sKey = pickStratumKey(row.pct)
  if (!sKey) {
    return false
  }
  const stratum = row.pct[sKey]
  if (!stratum) {
    return false
  }
  // Atlas 2.15 hides rows where pct < threshold across ALL cohorts —
  // i.e. at least one cohort must clear the bar.
  return Object.values(stratum).some((v) => typeof v === 'number' && v >= threshold.value)
}

function passesAnalysis(analysisId: number): boolean {
  return selectedAnalysisIds.value.length === 0 || selectedAnalysisIds.value.includes(analysisId)
}

function passesDomain(domainId: string | undefined): boolean {
  return (
    selectedDomains.value.length === 0 ||
    (domainId !== undefined && selectedDomains.value.includes(domainId))
  )
}

function filterCohorts(cohorts: LinkedCohort[]): LinkedCohort[] {
  if (selectedCohortId.value === null) {
    return cohorts
  }
  const filtered = cohorts.filter((c) => c.id === selectedCohortId.value)
  return filtered.length ? filtered : cohorts
}

interface PrevalenceGroup {
  analysisId: number
  analysisName: string
  cohorts: LinkedCohort[]
  rows: PrevalenceStat[]
}

interface DistributionGroup {
  analysisId: number
  analysisName: string
  cohorts: LinkedCohort[]
  rows: DistributionStat[]
}

const filteredPrevalenceGroups = computed<PrevalenceGroup[]>(() => {
  const groups = new Map<number, PrevalenceGroup>()
  for (const row of prevalence.value) {
    if (!passesAnalysis(row.analysisId)) continue
    if (!passesDomain(row.domainId)) continue
    if (!passesThreshold(row)) continue
    let g = groups.get(row.analysisId)
    if (!g) {
      g = {
        analysisId: row.analysisId,
        analysisName: row.analysisName,
        cohorts: filterCohorts(row.cohorts),
        rows: [],
      }
      groups.set(row.analysisId, g)
    }
    g.rows.push(row)
  }
  return Array.from(groups.values())
})

const filteredDistributionGroups = computed<DistributionGroup[]>(() => {
  const groups = new Map<number, DistributionGroup>()
  for (const row of distribution.value) {
    if (!passesAnalysis(row.analysisId)) continue
    if (!passesDomain(row.domainId)) continue
    let g = groups.get(row.analysisId)
    if (!g) {
      g = {
        analysisId: row.analysisId,
        analysisName: row.analysisName,
        cohorts: filterCohorts(row.cohorts),
        rows: [],
      }
      groups.set(row.analysisId, g)
    }
    g.rows.push(row)
  }
  return Array.from(groups.values())
})

const hasAnyPrevalence = computed<boolean>(
  () => filteredPrevalenceGroups.value.some((g) => g.rows.length > 0)
)

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

async function loadAll(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    if (executionId.value === null) {
      throw new Error('Invalid execution id')
    }

    const tasks: Promise<unknown>[] = []
    if (characterizationId.value !== null) {
      tasks.push(
        getCharacterization(characterizationId.value).then((c) => {
          characterization.value = c
        })
      )
    }
    tasks.push(
      getCharacterizationExecution(executionId.value).then((e) => {
        execution.value = e
      })
    )
    tasks.push(
      getCharacterizationResultCount(executionId.value).then((n) => {
        resultCount.value = n
      })
    )
    await Promise.all(tasks)

    const raw = await getCharacterizationResults(executionId.value, {})
    const mapped = mapCharacterizationResults(raw)
    prevalence.value = mapped.prevalence
    distribution.value = mapped.distribution
  } catch (err) {
    logger.error('CharacterizationResultsView', 'Failed to load results', err)
    loadError.value =
      err instanceof Error
        ? err.message
        : tv('dataSources.errorLoadingReport', 'Failed to load results.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadAll()
})

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function goBack(): void {
  if (characterizationId.value !== null) {
    router.push(`/characterizations/${characterizationId.value}`)
  } else {
    router.push('/characterizations')
  }
}

function onExport(): void {
  const groups = filteredPrevalenceGroups.value
  if (!groups.length) {
    return
  }
  // Flatten one row per (analysis, covariate, cohort) tuple, with one
  // count + one pct column. Easier for downstream consumption than a
  // wide cohort-pivoted matrix.
  interface CsvRow {
    analysisId: number
    analysisName: string
    covariateId: number
    covariateName: string
    conceptId: number
    cohortId: number
    cohortName: string
    count: number | null
    pct: number | null
    stdDiff: number | null
  }
  const rows: CsvRow[] = []
  for (const group of groups) {
    for (const row of group.rows) {
      const sKey = pickStratumKey(row.pct) ?? pickStratumKey(row.count)
      for (const cohort of row.cohorts) {
        rows.push({
          analysisId: row.analysisId,
          analysisName: row.analysisName,
          covariateId: row.covariateId,
          covariateName: row.covariateName,
          conceptId: row.conceptId,
          cohortId: cohort.id,
          cohortName: cohort.name,
          count: sKey ? row.count[sKey]?.[String(cohort.id)] ?? null : null,
          pct: sKey ? row.pct[sKey]?.[String(cohort.id)] ?? null : null,
          stdDiff: row.stdDiff ?? null,
        })
      }
    }
  }
  const csv = arrayToCsv<CsvRow>(rows, [
    { key: 'analysisId', label: 'Analysis ID' },
    { key: 'analysisName', label: 'Analysis' },
    { key: 'covariateId', label: 'Covariate ID' },
    { key: 'covariateName', label: 'Covariate' },
    { key: 'conceptId', label: 'Concept ID' },
    { key: 'cohortId', label: 'Cohort ID' },
    { key: 'cohortName', label: 'Cohort' },
    { key: 'count', label: 'Count' },
    { key: 'pct', label: 'Pct' },
    { key: 'stdDiff', label: 'Std Diff' },
  ])
  const filename = `characterization-${executionId.value ?? 'results'}.csv`
  downloadCsv(filename, csv)
}

function onExplore(row: PrevalenceStat): void {
  if (executionId.value === null) {
    return
  }
  // Use the first cohort by default — Atlas 2.15 lets the user pick
  // when there is more than one; we keep it simple and pop the first.
  const cohort = row.cohorts[0]
  if (!cohort) {
    return
  }
  exploreGenerationId.value = executionId.value
  exploreAnalysisId.value = row.analysisId
  exploreCohortId.value = cohort.id
  exploreCovariateId.value = row.covariateId
  exploreCovariateName.value = row.covariateName
  exploreOpen.value = true
}
</script>

<style scoped>
.page-wrapper {
  min-height: 100%;
  background-color: rgb(var(--v-theme-background));
  display: flex;
  padding: 32px;
  box-sizing: border-box;
}

.page-card {
  border-radius: 18px;
  padding: 30px;
  background-color: white;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.char-results__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.char-results__toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.char-results__toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.char-results__title {
  font-size: 1.5rem;
  font-weight: 500;
  margin: 0;
}

.char-results__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px;
}

.char-results__empty {
  padding: 48px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
