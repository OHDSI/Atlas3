<!--
  VisitDatesCohortReport Component
  Feature: 005-cohort-reports
  Task: T096

  Displays cohort visit dates analysis in a table format
-->
<template>
  <v-card elevation="0">
    <v-card-title class="text-h6">
      <v-icon class="mr-2">mdi-calendar-clock</v-icon>
      Visit Dates - Cohort Period
    </v-card-title>

    <v-divider />

    <v-card-text>
      <!-- Loading state -->
      <div v-if="loading" class="py-8">
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
            Retry
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
        icon="mdi-information"
      >
        No cohort visit dates data available
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useReports } from '@/composables/useReports'
import type { TableData } from '@/models/report.types'
import DataTable from '@/components/reports/tables/DataTable.vue'

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

  await loadReport(props.cohortId, props.sourceKey, 'visit-dates-cohort')

  // Transform report data to table format
  if (currentReport.value && 'data' in currentReport.value) {
    const data = currentReport.value.data

    const rows = (data as unknown as any[]).map((item: any) => ({
      date: item.date,
      visitCount: item.visitCount,
      personCount: item.personCount
    }))

    tableData.value = {
      headers: [
        { key: 'date', title: 'Date', sortable: true },
        { key: 'visitCount', title: 'Visit Count', sortable: true, align: 'end' },
        { key: 'personCount', title: 'Person Count', sortable: true, align: 'end' }
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
