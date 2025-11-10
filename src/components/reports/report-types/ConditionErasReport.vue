<!--
  ConditionErasReport Component
  Feature: 005-cohort-reports
  Tasks: T059-T065

  Condition prevalence report with table and treemap views
-->
<template>
  <div class="condition-eras-report">
    <v-card elevation="0">
      <v-card-title class="text-h6">
        Condition Era Prevalence
      </v-card-title>

      <!-- Tabs for Table vs Treemap view -->
      <v-tabs
        v-model="activeTab"
        bg-color="transparent"
      >
        <v-tab value="table">
          <v-icon start>
            mdi-table
          </v-icon>
          Table View
        </v-tab>
        <v-tab value="treemap">
          <v-icon start>
            mdi-chart-tree
          </v-icon>
          Treemap View
        </v-tab>
      </v-tabs>

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

        <v-window
          v-else-if="reportData"
          v-model="activeTab"
        >
          <!-- Table View -->
          <v-window-item value="table">
            <DataTable
              v-if="tableData && tableData.length > 0"
              :headers="tableHeaders"
              :items="tableData"
              :export-filename="`condition-eras-${sourceKey}.csv`"
            />
            <v-alert
              v-else
              type="info"
              variant="tonal"
            >
              {{ t('common.noData') }}
            </v-alert>
          </v-window-item>

          <!-- Treemap View -->
          <v-window-item value="treemap">
            <TreemapChart
              v-if="reportData.treemapData && reportData.treemapData.length > 0"
              :data="reportData.treemapData"
              title="Condition Era Prevalence by Person Count"
              :height="600"
            />
            <v-alert
              v-else
              type="info"
              variant="tonal"
            >
              {{ t('common.noData') }}
            </v-alert>
          </v-window-item>
        </v-window>

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
import type { ConditionErasReport, TableHeader, TableRow } from '@/models/report.types'
import DataTable from '../tables/DataTable.vue'
import TreemapChart from '../charts/TreemapChart.vue'

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
const activeTab = ref('table')
const loading = ref(false)
const error = ref<string | null>(null)

/**
 * Computed report data
 */
const reportData = computed<ConditionErasReport | null>(() => {
  return currentReportData.value as ConditionErasReport | null
})

/**
 * Table headers (T061)
 */
const tableHeaders: TableHeader[] = [
  {
    key: 'conceptId',
    title: 'Concept ID',
    sortable: true,
    align: 'start'
  },
  {
    key: 'soc',
    title: 'SOC',
    sortable: true,
    align: 'start'
  },
  {
    key: 'hlt',
    title: 'HLT',
    sortable: true,
    align: 'start'
  },
  {
    key: 'snomed',
    title: 'SNOMED',
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
 * Table data (T061)
 */
const tableData = computed<TableRow[]>(() => {
  if (!reportData.value?.prevalence) return []

  return (reportData.value.prevalence as any[]).map((item: any) => ({
    conceptId: item.conceptId,
    soc: item.soc || '-',
    hlt: item.hlt || '-',
    snomed: item.conceptName,
    personCount: item.personCount,
    prevalence: item.prevalence,
    averageDuration: Math.round(item.averageDuration)
  }))
})

/**
 * Fetch report data (T063)
 */
async function fetchData() {
  loading.value = true
  error.value = null

  try {
    await loadReport(props.cohortId, props.sourceKey, 'condition-eras')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load condition eras report'
    console.error('[ConditionErasReport] Error:', err)
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
.condition-eras-report {
  width: 100%;
}
</style>
