<template>
  <div class="data-density-report">
    <v-row>
      <v-col cols="12">
        <ChartSection title="Total Records Over Time">
          <MultiLineChart
            :data="data.totalRecords"
            :height="350"
          />
        </ChartSection>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <ChartSection title="Records Per Person Over Time">
          <MultiLineChart
            :data="data.recordsPerPerson"
            :height="350"
          />
        </ChartSection>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <ChartSection title="Average Concepts Per Person by Domain">
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
import type { DataDensityReport as DataDensityReportData } from '@/models/datasource.types'
import type { BarChartData } from '@/models/report.types'
import ChartSection from '@/components/datasources/shared/ChartSection.vue'
import MultiLineChart from '@/components/datasources/charts/MultiLineChart.vue'
import BarChart from '@/components/reports/charts/BarChart.vue'

interface Props {
  data: DataDensityReportData
}

const props = defineProps<Props>()

const conceptsBarChartData = computed<BarChartData>(() => ({
  categories: props.data.conceptsPerPerson.categories,
  values: props.data.conceptsPerPerson.series[0]?.data || [],
  unit: props.data.conceptsPerPerson.unit || 'Concepts'
}))
</script>

<style scoped>
.data-density-report {
  width: 100%;
}
</style>
