<template>
  <div class="observation-period-report">
    <!-- Age at First Observation -->
    <ChartSection v-if="data.ageAtFirst" :title="t('dataSources.observationPeriodReport.ageAtFirstObservation', 'Age at First Observation').value">
      <BarChart
        :data="data.ageAtFirst"
        :x-axis-label="t('dataSources.observationPeriodReport.age', 'Age').value"
        :y-axis-label="t('dataSources.observationPeriodReport.people', 'People').value"
        data-testid="age-at-first-chart"
      />
    </ChartSection>

    <!-- Observation Length Distribution -->
    <ChartSection v-if="data.observationLength" :title="t('dataSources.observationPeriodReport.observationLength', 'Observation Length').value">
      <BarChart
        :data="data.observationLength"
        :x-axis-label="t('dataSources.observationPeriodReport.days', 'Days').value"
        :y-axis-label="t('dataSources.observationPeriodReport.people', 'People').value"
        data-testid="observation-length-chart"
      />
    </ChartSection>

    <!-- Cumulative Observation -->
    <ChartSection v-if="data.cumulativeObservation" :title="t('dataSources.observationPeriodReport.cumulativeObservation', 'Cumulative Observation').value">
      <MultiLineChart
        :data="data.cumulativeObservation"
        :x-axis-label="t('dataSources.observationPeriodReport.days', 'Days').value"
        :y-axis-label="t('dataSources.observationPeriodReport.percentOfPopulation', 'Percent of Population').value"
        data-testid="cumulative-observation-chart"
      />
    </ChartSection>

    <!-- Observed by Month -->
    <ChartSection v-if="data.observedByMonth" :title="t('dataSources.observationPeriodReport.personsWithContinuousObservationByMonth', 'Persons With Continuous Observation By Month').value">
      <MultiLineChart
        :data="data.observedByMonth"
        :x-axis-label="t('dataSources.observationPeriodReport.date', 'Date').value"
        :y-axis-label="t('dataSources.observationPeriodReport.people', 'People').value"
        data-testid="observed-by-month-chart"
      />
    </ChartSection>

    <!-- Age by Gender -->
    <v-row v-if="data.ageByGender">
      <v-col cols="12">
        <ChartSection :title="t('dataSources.observationPeriodReport.ageByGender', 'Age by Gender').value">
          <MultiLineChart
            :data="data.ageByGender"
            :x-axis-label="t('dataSources.observationPeriodReport.age', 'Age').value"
            :y-axis-label="t('dataSources.observationPeriodReport.people', 'People').value"
            data-testid="age-by-gender-chart"
          />
        </ChartSection>
      </v-col>
    </v-row>

    <!-- Duration by Gender -->
    <v-row v-if="data.durationByGender">
      <v-col cols="12">
        <ChartSection :title="t('dataSources.observationPeriodReport.durationByGender', 'Duration By Gender').value">
          <BarChart
            :data="data.durationByGender"
            :x-axis-label="t('dataSources.observationPeriodReport.gender', 'Gender').value"
            :y-axis-label="t('dataSources.observationPeriodReport.days', 'Days').value"
            data-testid="duration-by-gender-chart"
          />
        </ChartSection>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { ObservationPeriodReport } from '@/models/datasource.types'
import ChartSection from './shared/ChartSection.vue'
import BarChart from '@/components/reports/charts/BarChart.vue'
import MultiLineChart from './charts/MultiLineChart.vue'

const { t } = useI18n()

defineProps<{
  data: ObservationPeriodReport
}>()
</script>

<style scoped>
.observation-period-report {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
</style>
