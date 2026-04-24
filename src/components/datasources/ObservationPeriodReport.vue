<template>
  <div class="observation-period-report">
    <!-- Age at First Observation -->
    <ChartSection
      v-if="data.ageAtFirst"
      :title="t('dataSources.observationPeriodReport.ageAtFirstObservation', 'Age at First Observation').value"
    >
      <BarChart
        :data="data.ageAtFirst"
        :x-axis-label="t('dataSources.observationPeriodReport.age', 'Age').value"
        :y-axis-label="t('dataSources.observationPeriodReport.people', 'People').value"
        data-testid="age-at-first-chart"
      />
    </ChartSection>

    <!-- Observation Length Distribution -->
    <ChartSection
      v-if="data.observationLength"
      :title="t('dataSources.observationPeriodReport.observationLength', 'Observation Length').value"
    >
      <BarChart
        :data="data.observationLength"
        :x-axis-label="t('dataSources.observationPeriodReport.days', 'Days').value"
        :y-axis-label="t('dataSources.observationPeriodReport.people', 'People').value"
        data-testid="observation-length-chart"
      />
    </ChartSection>

    <!-- Cumulative Observation -->
    <ChartSection
      v-if="data.cumulativeObservation"
      :title="t('dataSources.observationPeriodReport.cumulativeObservation', 'Cumulative Observation').value"
    >
      <MultiLineChart
        :data="data.cumulativeObservation"
        :x-axis-label="t('dataSources.observationPeriodReport.days', 'Days').value"
        :y-axis-label="t('dataSources.observationPeriodReport.percentOfPopulation', 'Percent of Population').value"
        data-testid="cumulative-observation-chart"
      />
    </ChartSection>

    <!-- Persons With Continuous Observation By Month -->
    <ChartSection
      v-if="data.observedByMonth"
      :title="t('dataSources.observationPeriodReport.personsWithContinuousObservationByMonth', 'Persons With Continuous Observation By Month').value"
    >
      <MultiLineChart
        :data="data.observedByMonth"
        :x-axis-label="t('dataSources.observationPeriodReport.date', 'Date').value"
        :y-axis-label="t('dataSources.observationPeriodReport.people', 'People').value"
        data-testid="observed-by-month-chart"
      />
    </ChartSection>

    <!-- Age by Gender (Boxplot) -->
    <ChartSection
      v-if="data.ageByGender && data.ageByGender.length > 0"
      :title="t('dataSources.observationPeriodReport.ageByGender', 'Age by Gender').value"
    >
      <BoxPlotChart
        :data="data.ageByGender"
        :height="400"
        data-testid="age-by-gender-chart"
      />
    </ChartSection>

    <!-- Duration by Gender (Boxplot) -->
    <ChartSection
      v-if="data.durationByGender && data.durationByGender.length > 0"
      :title="t('dataSources.observationPeriodReport.durationByGender', 'Duration By Gender').value"
    >
      <BoxPlotChart
        :data="data.durationByGender"
        :height="400"
        data-testid="duration-by-gender-chart"
      />
    </ChartSection>

    <!-- Duration by Age Decile (Boxplot) -->
    <ChartSection
      v-if="data.durationByAgeDecile && data.durationByAgeDecile.length > 0"
      :title="t('dataSources.observationPeriodReport.durationByAgeDecile', 'Duration By Age Decile').value"
    >
      <BoxPlotChart
        :data="data.durationByAgeDecile"
        :height="400"
        data-testid="duration-by-age-decile-chart"
      />
    </ChartSection>

    <!-- Persons With Continuous Observation By Year -->
    <ChartSection
      v-if="data.personsWithContinuousObsByYear"
      :title="t('dataSources.observationPeriodReport.personsWithContinuousObservationByYear', 'Persons With Continuous Observation By Year').value"
    >
      <BarChart
        :data="data.personsWithContinuousObsByYear"
        :x-axis-label="t('dataSources.observationPeriodReport.years', 'Years').value"
        :y-axis-label="t('dataSources.observationPeriodReport.people', 'People').value"
        data-testid="persons-continuous-by-year-chart"
      />
    </ChartSection>

    <!-- Observation Periods per Person (Donut) -->
    <ChartSection
      v-if="data.observationPeriodsPerPerson && data.observationPeriodsPerPerson.length > 0"
      :title="t('dataSources.observationPeriodReport.observationPeriodsPerPerson', 'Observation Periods per Person').value"
    >
      <PieChart
        :data="data.observationPeriodsPerPerson"
        data-testid="observation-periods-per-person-chart"
      />
    </ChartSection>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { ObservationPeriodReport } from '@/models/datasource.types'
import ChartSection from './shared/ChartSection.vue'
import BarChart from '@/components/reports/charts/BarChart.vue'
import BoxPlotChart from '@/components/reports/charts/BoxPlotChart.vue'
import PieChart from '@/components/reports/charts/PieChart.vue'
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
