<!--
  DeathReport Component
  

  Displays death data table with cause analysis
-->
<template>
  <v-card elevation="0">
    <v-card-title class="text-h6">
      <v-icon class="mr-2">
        mdi-heart-broken
      </v-icon>
      {{ t('dataSources.reports.death') }}
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
        icon="mdi-information"
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
 * i18n
 */
const { t, tv } = useI18n()

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

  await loadReport(props.cohortId, props.sourceKey, 'death')

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
        { key: 'conceptId', title: tv('columns.conceptId'), sortable: true },
        { key: 'conceptName', title: tv('common.causeOfDeath'), sortable: true },
        { key: 'recordsPerPerson', title: tv('dataSources.datadensityReport.recordsPerPerson'), sortable: true, align: 'end' },
        { key: 'personCount', title: tv('columns.personCount'), sortable: true, align: 'end' },
        { key: 'prevalence', title: tv('dataSources.prevalence'), sortable: true, align: 'end' }
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
