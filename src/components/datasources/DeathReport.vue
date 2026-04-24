<template>
  <div class="death-report">
    <!-- Age at Death by Gender -->
    <v-row v-if="data.ageAtDeath && data.ageAtDeath.length > 0">
      <v-col cols="12">
        <ChartSection :title="t('dataSources.deathReport.ageAtDeath', 'Age at Death').value">
          <BoxPlotChart
            :data="data.ageAtDeath"
            :title="t('dataSources.deathReport.ageAtDeath', 'Age at Death Distribution by Gender').value"
            :height="400"
            data-testid="age-at-death-chart"
          />
        </ChartSection>
      </v-col>
    </v-row>

    <!-- Death by Type -->
    <v-row v-if="data.deathByType && data.deathByType.length > 0">
      <v-col cols="12">
        <ChartSection :title="t('dataSources.deathReport.deathByType', 'Death by Type').value">
          <PieChart
            :data="data.deathByType"
            data-testid="death-by-type-chart"
          />
        </ChartSection>
      </v-col>
    </v-row>

    <!-- Prevalence by Month -->
    <v-row v-if="data.prevalenceByMonth">
      <v-col cols="12">
        <ChartSection :title="t('dataSources.deathReport.deathPrevalenceByMonth', 'Death Prevalence by Month').value">
          <MultiLineChart
            :data="data.prevalenceByMonth"
            :x-axis-label="t('dataSources.deathReport.date', 'Date').value"
            :y-axis-label="t('dataSources.deathReport.prevalencePer1000People', 'Prevalence Per 1000 People').value"
            data-testid="prevalence-by-month-chart"
          />
        </ChartSection>
      </v-col>
    </v-row>

    <!-- Prevalence by Gender, Age, Year (Trellis) -->
    <v-row v-if="data.prevalenceByGenderAgeYear && data.prevalenceByGenderAgeYear.series.length > 0">
      <v-col cols="12">
        <ChartSection :title="t('dataSources.deathReport.deathPrevalenceByAgeGenderYear', 'Death Prevalence by Age, Gender, Year').value">
          <TrellisChart
            :data="data.prevalenceByGenderAgeYear"
            :height="600"
            data-testid="prevalence-by-gender-age-year-chart"
          />
        </ChartSection>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { DeathReport } from '@/models/datasource.types'
import ChartSection from './shared/ChartSection.vue'
import PieChart from '@/components/reports/charts/PieChart.vue'
import BoxPlotChart from '@/components/reports/charts/BoxPlotChart.vue'
import TrellisChart from '@/components/reports/charts/TrellisChart.vue'
import MultiLineChart from './charts/MultiLineChart.vue'

const { t } = useI18n()

defineProps<{
  data: DeathReport
}>()
</script>

<style scoped>
.death-report {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
</style>
