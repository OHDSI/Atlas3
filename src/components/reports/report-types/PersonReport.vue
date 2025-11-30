<!--
  PersonReport Component

  Demographics report with year of birth and demographic pie charts
-->
<template>
  <div class="person-report">
    <v-card
      elevation="0"
      class="mb-4"
    >
      <v-card-title class="text-h6">
        {{ t('dataSources.personReport.yearOfBirth') }}
      </v-card-title>
      <v-card-text>
        <div v-if="sectionLoading('yearOfBirth')">
          <v-skeleton-loader
            type="image"
            height="400"
          />
        </div>
        <v-alert
          v-else-if="sectionError('yearOfBirth')"
          type="error"
          variant="tonal"
        >
          {{ sectionError('yearOfBirth') }}
          <template #append>
            <v-btn
              size="small"
              variant="text"
              @click="retrySections"
            >
              {{ t('common.retry') }}
            </v-btn>
          </template>
        </v-alert>
        <BarChart
          v-else-if="yearOfBirthData"
          :data="yearOfBirthData"
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

    <v-card elevation="0">
      <v-card-title class="text-h6">
        {{ t('common.demographics') }}
      </v-card-title>
      <v-card-text>
        <v-row>
          <!-- Gender -->
          <v-col
            cols="12"
            md="4"
          >
            <v-card variant="outlined">
              <v-card-title class="text-subtitle-1">
                {{ t('dataSources.personReport.gender') }}
              </v-card-title>
              <v-card-text>
                <div v-if="sectionLoading('gender')">
                  <v-skeleton-loader
                    type="image"
                    height="350"
                  />
                </div>
                <v-alert
                  v-else-if="sectionError('gender')"
                  type="error"
                  variant="tonal"
                  density="compact"
                >
                  {{ t('common.failedToLoad') }}
                </v-alert>
                <PieChart
                  v-else-if="genderData && genderData.length > 0"
                  :data="genderData"
                  :height="350"
                />
                <v-alert
                  v-else
                  type="info"
                  variant="tonal"
                  density="compact"
                >
                  {{ t('common.noData') }}
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Race -->
          <v-col
            cols="12"
            md="4"
          >
            <v-card variant="outlined">
              <v-card-title class="text-subtitle-1">
                {{ t('dataSources.personReport.race') }}
              </v-card-title>
              <v-card-text>
                <div v-if="sectionLoading('race')">
                  <v-skeleton-loader
                    type="image"
                    height="350"
                  />
                </div>
                <v-alert
                  v-else-if="sectionError('race')"
                  type="error"
                  variant="tonal"
                  density="compact"
                >
                  {{ t('common.failedToLoad') }}
                </v-alert>
                <PieChart
                  v-else-if="raceData && raceData.length > 0"
                  :data="raceData"
                  :height="350"
                />
                <v-alert
                  v-else
                  type="info"
                  variant="tonal"
                  density="compact"
                >
                  {{ t('common.noData') }}
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Ethnicity -->
          <v-col
            cols="12"
            md="4"
          >
            <v-card variant="outlined">
              <v-card-title class="text-subtitle-1">
                {{ t('dataSources.personReport.ethnicity') }}
              </v-card-title>
              <v-card-text>
                <div v-if="sectionLoading('ethnicity')">
                  <v-skeleton-loader
                    type="image"
                    height="350"
                  />
                </div>
                <v-alert
                  v-else-if="sectionError('ethnicity')"
                  type="error"
                  variant="tonal"
                  density="compact"
                >
                  {{ t('common.failedToLoad') }}
                </v-alert>
                <PieChart
                  v-else-if="ethnicityData && ethnicityData.length > 0"
                  :data="ethnicityData"
                  :height="350"
                />
                <v-alert
                  v-else
                  type="info"
                  variant="tonal"
                  density="compact"
                >
                  {{ t('common.noData') }}
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useReports } from '@/composables/useReports'
import { useI18n } from '@/composables/useI18n'
import type { PersonReport, BarChartData, PieChartData } from '@/models/report.types'
import { toBarChartData, toPieChartData } from '@/services/report-mapper'
import BarChart from '../charts/BarChart.vue'
import PieChart from '../charts/PieChart.vue'

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
const reportData = computed<PersonReport | null>(() => {
  return currentReportData.value as PersonReport | null
})

/**
 * Year of birth chart data
 */
const yearOfBirthData = computed<BarChartData | null>(() => {
  if (!reportData.value?.yearOfBirth || reportData.value.yearOfBirth.length === 0) {
    return null
  }

  return toBarChartData(
    reportData.value.yearOfBirth,
    'year',
    'count',
    'People'
  )
})

/**
 * Gender pie chart data
 */
const genderData = computed<PieChartData[] | null>(() => {
  if (!reportData.value?.demographics?.gender || reportData.value.demographics.gender.length === 0) {
    return null
  }

  return toPieChartData(
    reportData.value.demographics.gender,
    'conceptName',
    'count'
  )
})

/**
 * Race pie chart data
 */
const raceData = computed<PieChartData[] | null>(() => {
  if (!reportData.value?.demographics?.race || reportData.value.demographics.race.length === 0) {
    return null
  }

  return toPieChartData(
    reportData.value.demographics.race,
    'conceptName',
    'count'
  )
})

/**
 * Ethnicity pie chart data
 */
const ethnicityData = computed<PieChartData[] | null>(() => {
  if (!reportData.value?.demographics?.ethnicity || reportData.value.demographics.ethnicity.length === 0) {
    return null
  }

  return toPieChartData(
    reportData.value.demographics.ethnicity,
    'conceptName',
    'count'
  )
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
 * Fetch report data
 */
async function fetchData() {
  sectionsLoading.value.clear()
  sectionsLoading.value.add('yearOfBirth')
  sectionsLoading.value.add('gender')
  sectionsLoading.value.add('race')
  sectionsLoading.value.add('ethnicity')

  try {
    await loadReport(props.cohortId, props.sourceKey, 'person')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load report'
    sectionsErrors.value.set('yearOfBirth', message)
    sectionsErrors.value.set('gender', message)
    sectionsErrors.value.set('race', message)
    sectionsErrors.value.set('ethnicity', message)
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
.person-report {
  width: 100%;
}
</style>
