<!--
  DrugErasReport Component
  Feature: 005-cohort-reports
  Tasks: T066-T070

  Drug exposure prevalence report with table view
-->
<template>
  <div class="drug-eras-report">
    <v-card elevation="0">
      <v-card-title class="text-h6">
        Drug Era Prevalence
      </v-card-title>

      <v-divider />

      <v-card-text>
        <div v-if="loading">
          <v-skeleton-loader type="table" />
        </div>

        <v-alert
          v-else-if="error"
          type="error"
          variant="tonal"
        >
          {{ error }}
          <template #append>
            <v-btn
              size="small"
              variant="text"
              @click="fetchData"
            >
              Retry
            </v-btn>
          </template>
        </v-alert>

        <div v-else-if="reportData">
          <DataTable
            v-if="tableData && tableData.length > 0"
            :headers="tableHeaders"
            :items="tableData"
            :export-filename="`drug-eras-${sourceKey}.csv`"
          />
          <v-alert
            v-else
            type="info"
            variant="tonal"
          >
            {{ t('common.noData') }}
          </v-alert>
        </div>

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
import type { DrugErasReport, TableHeader, TableRow } from '@/models/report.types'
import DataTable from '../tables/DataTable.vue'

/**
 * Props
 */
const props = defineProps<{
  cohortId: number
  sourceKey: string
}>()

/**
 * i18n
 */
const { t } = useI18n()

/**
 * Reports composable
 */
const { loadReport, currentReportData } = useReports()

/**
 * State
 */
const loading = ref(false)
const error = ref<string | null>(null)

/**
 * Computed report data
 */
const reportData = computed<DrugErasReport | null>(() => {
  return currentReportData.value as DrugErasReport | null
})

/**
 * Table headers (T067)
 */
const tableHeaders: TableHeader[] = [
  {
    key: 'conceptId',
    title: 'Concept ID',
    sortable: true,
    align: 'start'
  },
  {
    key: 'atc1',
    title: 'ATC 1',
    sortable: true,
    align: 'start'
  },
  {
    key: 'atc4',
    title: 'ATC 4',
    sortable: true,
    align: 'start'
  },
  {
    key: 'ingredient',
    title: 'Ingredient',
    sortable: true,
    align: 'start'
  },
  {
    key: 'personCount',
    title: 'Person Count',
    sortable: true,
    align: 'end'
  },
  {
    key: 'prevalence',
    title: 'Prevalence (%)',
    sortable: true,
    align: 'end'
  },
  {
    key: 'averageDuration',
    title: 'Avg Duration (days)',
    sortable: true,
    align: 'end'
  }
]

/**
 * Table data (T067)
 */
const tableData = computed<TableRow[]>(() => {
  if (!reportData.value?.prevalence) return []

  return reportData.value.prevalence.map(item => ({
    conceptId: item.conceptId,
    atc1: item.atc1 || '-',
    atc4: item.atc4 || '-',
    ingredient: item.ingredient,
    personCount: item.personCount,
    prevalence: item.prevalence,
    averageDuration: Math.round(item.averageDuration)
  }))
})

/**
 * Fetch report data (T068)
 */
async function fetchData() {
  loading.value = true
  error.value = null

  try {
    await loadReport(props.cohortId, props.sourceKey, 'drug-eras')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load drug eras report'
    console.error('[DrugErasReport] Error:', err)
  } finally {
    loading.value = false
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
.drug-eras-report {
  width: 100%;
}
</style>
