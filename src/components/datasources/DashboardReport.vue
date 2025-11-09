<template>
  <div class="dashboard-report">
    <v-row>
      <v-col cols="12">
        <CDMSummaryTable :data="data.summary" />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <ChartSection :title="t('dataSources.dashboardReport.populationByGender', 'Population by Gender').value">
          <DashboardGenderChart
            :data="data.genderDistribution"
            :height="300"
          />
        </ChartSection>
      </v-col>
      
      <v-col cols="12" md="6">
        <ChartSection :title="t('dataSources.dashboardReport.ageAtFirstObservation', 'Age at First Observation').value">
          <DashboardAgeChart
            :data="data.ageDistribution"
            :height="300"
          />
        </ChartSection>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <ChartSection :title="t('dataSources.dashboardReport.cumulativeObservation', 'Cumulative Observation').value">
          <DashboardCumulativeChart
            :data="data.cumulativeObservation"
            :height="300"
          />
        </ChartSection>
      </v-col>
      
      <v-col cols="12" md="6">
        <ChartSection :title="t('dataSources.dashboardReport.personsWithContinuousObservationByMonth', 'Persons With Continuous Observation By Month').value">
          <DashboardObservationMonthChart
            :data="data.observationByMonth"
            :height="300"
          />
        </ChartSection>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { DashboardReport as DashboardReportData } from '@/models/datasource.types'
import CDMSummaryTable from '@/components/datasources/shared/CDMSummaryTable.vue'
import ChartSection from '@/components/datasources/shared/ChartSection.vue'
import DashboardGenderChart from '@/components/datasources/charts/DashboardGenderChart.vue'
import DashboardAgeChart from '@/components/datasources/charts/DashboardAgeChart.vue'
import DashboardCumulativeChart from '@/components/datasources/charts/DashboardCumulativeChart.vue'
import DashboardObservationMonthChart from '@/components/datasources/charts/DashboardObservationMonthChart.vue'

const { t } = useI18n()

interface Props {
  data: DashboardReportData
}

defineProps<Props>()
</script>

<style scoped>
.dashboard-report {
  width: 100%;
}
</style>
