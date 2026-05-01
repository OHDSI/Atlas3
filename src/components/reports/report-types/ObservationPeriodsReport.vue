<!--
  ObservationPeriodsReport Component
  

  Displays observation period data table
-->
<template>
  <v-card elevation="0">
    <v-card-title class="text-h6">
      <v-icon class="mr-2">
        mdi-calendar-range
      </v-icon>
      {{ t('dataSources.reports.observationPeriod') }}
    </v-card-title>

    <v-divider />

    <v-card-text>
      <!-- Loading state -->
      <div
        v-if="loading"
        class="py-8"
      >
        <v-skeleton-loader type="table" />
      </div>

      <!-- Error state -->
      <v-alert
        v-else-if="error"
        type="error"
        variant="tonal"
        closable
        class="mb-4"
      >
        <div class="d-flex align-center justify-space-between">
          <span>{{ error }}</span>
          <v-btn
            variant="text"
            size="small"
            @click="loadData"
          >
            {{ t('common.retry') }}
          </v-btn>
        </div>
      </v-alert>

      <!-- Data table -->
      <DataTable
        v-else-if="tableData"
        :items="tableData.rows"
        :headers="tableData.headers"
        :loading="loading"
      />

      <!-- Empty state -->
      <v-alert
        v-else
        type="info"
        variant="tonal"
      >
        {{ t('common.noData') }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useReports } from '@/composables/useReports'
import { useI18n } from '@/composables/useI18n'
import type { TableData, ConditionData } from '@/models/report.types'
import { hasPrevalence } from '@/models/report.types'
import DataTable from '@/components/reports/tables/DataTable.vue'

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
const { loading, error, loadReport, currentReport } = useReports()

/**
 * Table data
 */
const tableData = ref<TableData | null>(null)

/**
 * Load data
 */
async function loadData() {
  if (!props.cohortId || !props.sourceKey) return

  await loadReport(props.cohortId, props.sourceKey, 'observation-periods')

  // Transform report data to table format
  if (currentReport.value && hasPrevalence(currentReport.value)) {
    const data = currentReport.value.prevalence as ConditionData[]

    const rows = data.map((item) => ({
      conceptId: item.conceptId,
      conceptName: item.conceptName || 'Unknown',
      recordsPerPerson: item.recordsPerPerson?.toFixed(2) || 'N/A',
      personCount: item.personCount,
      prevalence: item.prevalence?.toFixed(2) || 'N/A'
    }))

    tableData.value = {
      headers: [
        { key: 'conceptId', title: 'Concept ID', sortable: true },
        { key: 'conceptName', title: 'Period Type', sortable: true },
        { key: 'recordsPerPerson', title: 'Records Per Person', sortable: true, align: 'end' },
        { key: 'personCount', title: 'Person Count', sortable: true, align: 'end' },
        { key: 'prevalence', title: 'Prevalence (%)', sortable: true, align: 'end' }
      ],
      rows,
      totalRows: rows.length
    }
  }
}

/**
 * Load on mount
 */
onMounted(() => {
  loadData()
})

/**
 * Reload when props change
 */
watch(
  () => [props.cohortId, props.sourceKey],
  () => {
    loadData()
  }
)
</script>
