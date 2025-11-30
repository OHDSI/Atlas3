<!--
  HeraclesHeelReport Component

  Displays data quality Achilles Heel results in a table format
-->
<template>
  <v-card elevation="0">
    <v-card-title class="text-h6">
      <v-icon class="mr-2">
        mdi-alert-circle-check
      </v-icon>
      {{ t('common.dataQuality') }}
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
        type="success"
        variant="tonal"
        icon="mdi-check-circle"
      >
        {{ t('common.noIssuesDetected') }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useReports } from '@/composables/useReports'
import { useI18n } from '@/composables/useI18n'
import type { TableData } from '@/models/report.types'
import DataTable from '@/components/reports/tables/DataTable.vue'

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

  await loadReport(props.cohortId, props.sourceKey, 'heracles-heel')

  // Transform report data to table format
  if (currentReport.value && 'results' in currentReport.value) {
    const data = currentReport.value.results

    const rows = (data as any[]).map((item: any) => ({
      analysisId: item.analysisId,
      analysisName: item.analysisName,
      heelRule: item.heelRule,
      recordCount: item.recordCount,
      severity: item.severity
    }))

    tableData.value = {
      headers: [
        { key: 'analysisId', title: 'Analysis ID', sortable: true },
        { key: 'analysisName', title: 'Analysis Name', sortable: true },
        { key: 'heelRule', title: 'Rule', sortable: true },
        { key: 'recordCount', title: 'Record Count', sortable: true, align: 'end' },
        { key: 'severity', title: 'Severity', sortable: true }
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
