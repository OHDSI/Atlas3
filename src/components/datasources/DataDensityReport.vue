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
        <ChartSection :title="t('dataSources.datadensityReport.recordsPerPerson', 'Records Per Person').value">
          <MultiLineChart
            :data="data.recordsPerPerson"
            :height="350"
          />
        </ChartSection>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <ChartSection :title="t('dataSources.datadensityReport.conceptsPerPerson', 'Concepts per Person').value">
          <BarChart
            :data="conceptsBarChartData"
            :height="350"
          />
        </ChartSection>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { DataDensityReport as DataDensityReportData } from '@/models/datasource.types'
import type { BarChartData } from '@/models/report.types'
import ChartSection from '@/components/datasources/shared/ChartSection.vue'
import MultiLineChart from '@/components/datasources/charts/MultiLineChart.vue'
import BarChart from '@/components/reports/charts/BarChart.vue'

const { t } = useI18n()

interface Props {
  data: DataDensityReportData
}

const props = defineProps<Props>()

const conceptsBarChartData = computed<BarChartData>(() => ({
  categories: props.data.conceptsPerPerson.categories,
  values: props.data.conceptsPerPerson.series[0]?.data || [],
  unit: props.data.conceptsPerPerson.unit || t('common.concepts', 'Concepts').value
}))
</script>

<style scoped>
.data-density-report {
  width: 100%;
}
</style>
