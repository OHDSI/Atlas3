<!--
  CohortSpecificReport Component
  Feature: 005-cohort-reports
  Tasks: T071-T078

  Cohort-specific analytics with multiple chart sections
-->
<template>
  <div class="cohort-specific-report">
    <!-- Prevalence by Month -->
    <v-card
      elevation="0"
      class="mb-4"
    >
      <v-card-title class="text-h6">
        Prevalence by Month
      </v-card-title>
      <v-card-text>
        <div v-if="sectionLoading('prevalence')">
          <v-skeleton-loader
            type="image"
            height="400"
          />
        </div>
        <v-alert
          v-else-if="sectionError('prevalence')"
          type="error"
          variant="tonal"
        >
          {{ sectionError('prevalence') }}
          <template #append>
            <v-btn
              size="small"
              variant="text"
              @click="retrySections"
            >
              Retry
            </v-btn>
          </template>
        </v-alert>
        <LineChart
          v-else-if="prevalenceByMonthData"
          :data="prevalenceByMonthData"
          title="Monthly Prevalence (per 1000 people)"
          :height="400"
        />
        <v-alert
          v-else
          type="info"
          variant="tonal"
        >
          {{ t('common.noData') }}
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Cohort Start Summary -->
    <v-card
      elevation="0"
      class="mb-4"
    >
      <v-card-title class="text-h6">
        Cohort Summary
      </v-card-title>
      <v-card-text>
        <div
          v-if="reportData?.cohortStart"
          class="cohort-summary"
        >
          <v-row>
            <v-col
              cols="12"
              md="4"
            >
              <v-card variant="outlined">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold">
                    {{ reportData.cohortStart.totalPersons.toLocaleString() }}
                  </div>
                  <div class="text-subtitle-2 text-grey">
                    Total Persons
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col
              cols="12"
              md="4"
            >
              <v-card variant="outlined">
                <v-card-text class="text-center">
                  <div class="text-h6">
                    {{ reportData.cohortStart.startDate || '-' }}
                  </div>
                  <div class="text-subtitle-2 text-grey">
                    Start Date
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col
              cols="12"
              md="4"
            >
              <v-card variant="outlined">
                <v-card-text class="text-center">
                  <div class="text-h6">
                    {{ reportData.cohortStart.endDate || '-' }}
                  </div>
                  <div class="text-subtitle-2 text-grey">
                    End Date
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
        <v-alert
          v-else
          type="info"
          variant="tonal"
        >
          No cohort summary available
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Age Distribution -->
    <v-card
      elevation="0"
      class="mb-4"
    >
      <v-card-title class="text-h6">
        Age Distribution
      </v-card-title>
      <v-card-text>
        <div v-if="sectionLoading('age')">
          <v-skeleton-loader
            type="image"
            height="400"
          />
        </div>
        <v-alert
          v-else-if="sectionError('age')"
          type="error"
          variant="tonal"
        >
          {{ sectionError('age') }}
        </v-alert>
        <BarChart
          v-else-if="ageDistributionData"
          :data="ageDistributionData"
          :height="400"
        />
        <v-alert
          v-else
          type="info"
          variant="tonal"
        >
          {{ t('common.noData') }}
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Duration Distribution -->
    <v-card elevation="0">
      <v-card-title class="text-h6">
        Duration Distribution
      </v-card-title>
      <v-card-text>
        <div v-if="sectionLoading('duration')">
          <v-skeleton-loader
            type="image"
            height="400"
          />
        </div>
        <v-alert
          v-else-if="sectionError('duration')"
          type="error"
          variant="tonal"
        >
          {{ sectionError('duration') }}
        </v-alert>
        <BarChart
          v-else-if="durationDistributionData"
          :data="durationDistributionData"
          :height="400"
        />
        <v-alert
          v-else
          type="info"
          variant="tonal"
        >
          {{ t('common.noData') }}
        </v-alert>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useReports } from '@/composables/useReports'
import { useI18n } from '@/composables/useI18n'
import type { CohortSpecificReport, BarChartData, LineChartData } from '@/models/report.types'
import { toBarChartData, toLineChartData } from '@/services/report-mapper'
import BarChart from '../charts/BarChart.vue'
import LineChart from '../charts/LineChart.vue'

/**
 * i18n
 */
const { t } = useI18n()

/**
 * Props
 */
const props = defineProps<{
  cohortId: number
  sourceKey: string
}>()

/**
 * Reports composable
 */
const { loadReport, currentReportData } = useReports()

/**
 * Section loading and error states
 */
const sectionsLoading = ref<Set<string>>(new Set())
const sectionsErrors = ref<Map<string, string>>(new Map())

/**
 * Computed report data
 */
const reportData = computed<CohortSpecificReport | null>(() => {
  return currentReportData.value as CohortSpecificReport | null
})

/**
 * Prevalence by month chart data (T072)
 */
const prevalenceByMonthData = computed<LineChartData | null>(() => {
  if (!reportData.value?.prevalenceByMonth || reportData.value.prevalenceByMonth.length === 0) {
    return null
  }

  return toLineChartData(
    reportData.value.prevalenceByMonth,
    'date',
    'prevalence',
    'Prevalence'
  )
})

/**
 * Age distribution chart data (T074)
 */
const ageDistributionData = computed<BarChartData | null>(() => {
  if (!reportData.value?.ageDistribution || reportData.value.ageDistribution.length === 0) {
    return null
  }

  return toBarChartData(
    reportData.value.ageDistribution,
    'age',
    'count',
    'People'
  )
})

/**
 * Duration distribution chart data (T075)
 */
const durationDistributionData = computed<BarChartData | null>(() => {
  if (!reportData.value?.durationDistribution || reportData.value.durationDistribution.length === 0) {
    return null
  }

  // Group durations into bins for better visualization
  const grouped = reportData.value.durationDistribution.reduce((acc, item) => {
    let bin: string
    if (item.days < 30) {
      bin = '< 30 days'
    } else if (item.days < 90) {
      bin = '30-90 days'
    } else if (item.days < 180) {
      bin = '90-180 days'
    } else if (item.days < 365) {
      bin = '180-365 days'
    } else {
      bin = '> 1 year'
    }

    if (!acc[bin]) {
      acc[bin] = 0
    }
    acc[bin] = (acc[bin] ?? 0) + (item.percentOfPopulation ?? 0)
    return acc
  }, {} as Record<string, number>)

  const binOrder = ['< 30 days', '30-90 days', '90-180 days', '180-365 days', '> 1 year']
  const categories = binOrder.filter(bin => grouped[bin] !== undefined)
  const values = categories.map(bin => grouped[bin]!)

  return {
    categories,
    values,
    unit: '% of Population'
  }
})

/**
 * Check if section is loading
 */
function sectionLoading(section: string): boolean {
  return sectionsLoading.value.has(section)
}

/**
 * Get section error
 */
function sectionError(section: string): string | null {
  return sectionsErrors.value.get(section) || null
}

/**
 * Retry loading sections
 */
async function retrySections() {
  sectionsErrors.value.clear()
  await fetchData()
}

/**
 * Fetch report data (T076)
 */
async function fetchData() {
  sectionsLoading.value.clear()
  sectionsLoading.value.add('prevalence')
  sectionsLoading.value.add('age')
  sectionsLoading.value.add('duration')

  try {
    await loadReport(props.cohortId, props.sourceKey, 'cohort-specific')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load report'
    sectionsErrors.value.set('prevalence', message)
    sectionsErrors.value.set('age', message)
    sectionsErrors.value.set('duration', message)
  } finally {
    sectionsLoading.value.clear()
  }
}

/**
 * Load data on mount
 */
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.cohort-specific-report {
  width: 100%;
}

.cohort-summary {
  padding: 1rem 0;
}
</style>
