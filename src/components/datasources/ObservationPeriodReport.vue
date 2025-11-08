<template>
  <div class="observation-period-report">
    <!-- Age at First Observation -->
    <ChartSection v-if="data.ageAtFirst" title="Age at First Observation">
      <BarChart
        :data="data.ageAtFirst"
        x-axis-label="Age"
        y-axis-label="Person Count"
        data-testid="age-at-first-chart"
      />
    </ChartSection>

    <!-- Observation Length Distribution -->
    <ChartSection v-if="data.observationLength" title="Observation Length Distribution">
      <BarChart
        :data="data.observationLength"
        x-axis-label="Days"
        y-axis-label="Person Count"
        data-testid="observation-length-chart"
      />
    </ChartSection>

    <!-- Cumulative Observation -->
    <ChartSection v-if="data.cumulativeObservation" title="Cumulative Observation">
      <MultiLineChart
        :data="data.cumulativeObservation"
        x-axis-label="Days"
        y-axis-label="Percent of Persons"
        data-testid="cumulative-observation-chart"
      />
    </ChartSection>

    <!-- Observed by Month -->
    <ChartSection v-if="data.observedByMonth" title="Observed by Month">
      <MultiLineChart
        :data="data.observedByMonth"
        x-axis-label="Month"
        y-axis-label="Person Count"
        data-testid="observed-by-month-chart"
      />
    </ChartSection>

    <!-- Age by Gender -->
    <v-row v-if="data.ageByGender">
      <v-col cols="12">
        <ChartSection title="Age Distribution by Gender">
          <MultiLineChart
            :data="data.ageByGender"
            x-axis-label="Age"
            y-axis-label="Person Count"
            data-testid="age-by-gender-chart"
          />
        </ChartSection>
      </v-col>
    </v-row>

    <!-- Duration by Gender -->
    <v-row v-if="data.durationByGender">
      <v-col cols="12">
        <ChartSection title="Observation Duration by Gender">
          <BarChart
            :data="data.durationByGender"
            x-axis-label="Gender"
            y-axis-label="Days"
            data-testid="duration-by-gender-chart"
          />
        </ChartSection>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import type { ObservationPeriodReport } from '@/models/datasource.types'
import ChartSection from './shared/ChartSection.vue'
import BarChart from '@/components/reports/charts/BarChart.vue'
import MultiLineChart from './charts/MultiLineChart.vue'

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
