<template>
  <div class="observation-period-report">
    <EmptyReportState
      v-if="!hasData"
      :title="
        t('dataSources.observationPeriodReport.noDataTitle')
          .value
      "
      :subtitle="
        t('dataSources.observationPeriodReport.noDataSubtitle').value
      "
    />

    <!-- Age at First Observation -->
    <ChartSection
      v-if="data.ageAtFirst"
      :title="
        t('dataSources.observationPeriodReport.ageAtFirstObservation')
          .value
      "
    >
      <DashboardAgeChart
        :data="data.ageAtFirst"
        :height="300"
        data-testid="age-at-first-chart"
      />
    </ChartSection>

    <!-- Observation Length Distribution -->
    <ChartSection
      v-if="data.observationLength"
      :title="
        t('dataSources.observationPeriodReport.observationLength').value
      "
    >
      <DashboardAgeChart
        :data="data.observationLength"
        :height="300"
        data-testid="observation-length-chart"
      />
    </ChartSection>

    <!-- Cumulative Observation -->
    <ChartSection
      v-if="data.cumulativeObservation"
      :title="
        t('dataSources.observationPeriodReport.cumulativeObservation')
          .value
      "
    >
      <MultiLineChart
        :data="data.cumulativeObservation"
        :x-axis-label="t('dataSources.observationPeriodReport.days').value"
        :y-axis-label="
          t('dataSources.observationPeriodReport.percentOfPopulation')
            .value
        "
        data-testid="cumulative-observation-chart"
      />
    </ChartSection>

    <!-- Persons With Continuous Observation By Month -->
    <ChartSection
      v-if="data.observedByMonth"
      :title="
        t('dataSources.observationPeriodReport.personsWithContinuousObservationByMonth').value
      "
    >
      <MultiLineChart
        :data="data.observedByMonth"
        :x-axis-label="t('dataSources.observationPeriodReport.date').value"
        :y-axis-label="t('dataSources.observationPeriodReport.people').value"
        data-testid="observed-by-month-chart"
      />
    </ChartSection>

    <!-- Age by Gender (Boxplot) -->
    <ChartSection
      v-if="data.ageByGender && data.ageByGender.length > 0"
      :title="t('dataSources.observationPeriodReport.ageByGender').value"
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
      :title="t('dataSources.observationPeriodReport.durationByGender').value"
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
      :title="
        t('dataSources.observationPeriodReport.durationByAgeDecile').value
      "
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
      :title="
        t('dataSources.observationPeriodReport.personsWithContinuousObservationByYear').value
      "
    >
      <BarChart
        :data="data.personsWithContinuousObsByYear"
        :x-axis-label="t('dataSources.observationPeriodReport.years').value"
        :y-axis-label="t('dataSources.observationPeriodReport.people').value"
        data-testid="persons-continuous-by-year-chart"
      />
    </ChartSection>

    <!-- Observation Periods per Person (Donut) -->
    <ChartSection
      v-if="data.observationPeriodsPerPerson && data.observationPeriodsPerPerson.length > 0"
      :title="
        t('dataSources.observationPeriodReport.observationPeriodsPerPerson').value
      "
    >
      <PieChart
        :data="data.observationPeriodsPerPerson"
        data-testid="observation-periods-per-person-chart"
      />
    </ChartSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { ObservationPeriodReport } from '@/models/datasource.types'
import ChartSection from './shared/ChartSection.vue'
import EmptyReportState from './shared/EmptyReportState.vue'
import BarChart from '@/components/ui/charts/AtlasBarChart.vue'
import BoxPlotChart from '@/components/ui/charts/AtlasBoxPlotChart.vue'
import PieChart from '@/components/ui/charts/AtlasPieChart.vue'
import MultiLineChart from './charts/MultiLineChart.vue'
import DashboardAgeChart from './charts/DashboardAgeChart.vue'

const { t } = useI18n()

const props = defineProps<{
  data: ObservationPeriodReport
}>()

const hasData = computed(() => {
  const d = props.data
  const sectionLengths = [
    d.ageAtFirst?.bins?.length,
    d.observationLength?.bins?.length,
    d.cumulativeObservation?.series?.length,
    d.observedByMonth?.series?.length,
    d.ageByGender?.length,
    d.durationByGender?.length,
    d.durationByAgeDecile?.length,
    d.personsWithContinuousObsByYear?.values?.length,
    d.observationPeriodsPerPerson?.length,
  ]
  return sectionLengths.some(n => Boolean(n))
})
</script>

<style scoped>
.observation-period-report {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
</style>
