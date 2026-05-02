<template>
  <div class="data-density-report">
    <v-row>
      <v-col cols="12">
        <ChartSection :title="t('dataSources.datadensityReport.totalRows', 'Total Rows').value">
          <MultiLineChart
            :data="data.totalRecords"
            :height="350"
          />
        </ChartSection>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <ChartSection
          :title="t('dataSources.datadensityReport.recordsPerPerson', 'Records Per Person').value"
        >
          <MultiLineChart
            :data="data.recordsPerPerson"
            :height="350"
          />
        </ChartSection>
      </v-col>
    </v-row>

    <v-row v-if="data.conceptsPerPerson && data.conceptsPerPerson.length > 0">
      <v-col cols="12">
        <ChartSection
          :title="t('dataSources.datadensityReport.conceptsPerPerson', 'Concepts per Person').value"
        >
          <BoxPlotChart
            :data="data.conceptsPerPerson"
            :height="350"
            data-testid="concepts-per-person-chart"
          />
        </ChartSection>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { DataDensityReport as DataDensityReportData } from '@/models/datasource.types'
import ChartSection from '@/components/datasources/shared/ChartSection.vue'
import MultiLineChart from '@/components/datasources/charts/MultiLineChart.vue'
import BoxPlotChart from '@/components/reports/charts/BoxPlotChart.vue'

const { t } = useI18n()

defineProps<{
  data: DataDensityReportData
}>()
</script>

<style scoped>
.data-density-report {
  width: 100%;
}
</style>
