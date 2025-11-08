<template>
  <div class="person-report">
    <v-row>
      <v-col cols="12">
        <ChartSection title="Year of Birth Distribution">
          <BarChart
            :data="yearOfBirthBarChartData"
            :height="350"
          />
        </ChartSection>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="4">
        <ChartSection title="Gender Distribution">
          <PieChart
            :data="data.gender"
            :height="300"
          />
        </ChartSection>
      </v-col>
      
      <v-col cols="12" md="4">
        <ChartSection title="Race Distribution">
          <PieChart
            :data="data.race"
            :height="300"
          />
        </ChartSection>
      </v-col>
      
      <v-col cols="12" md="4">
        <ChartSection title="Ethnicity Distribution">
          <PieChart
            :data="data.ethnicity"
            :height="300"
          />
        </ChartSection>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PersonReport as PersonReportData } from '@/models/datasource.types'
import type { BarChartData } from '@/models/report.types'
import ChartSection from '@/components/datasources/shared/ChartSection.vue'
import PieChart from '@/components/reports/charts/PieChart.vue'
import BarChart from '@/components/reports/charts/BarChart.vue'

interface Props {
  data: PersonReportData
}

const props = defineProps<Props>()

const yearOfBirthBarChartData = computed<BarChartData>(() => ({
  categories: props.data.yearOfBirth.categories,
  values: props.data.yearOfBirth.series[0]?.data || [],
  unit: props.data.yearOfBirth.unit || 'People'
}))
</script>

<style scoped>
.person-report {
  width: 100%;
}
</style>
