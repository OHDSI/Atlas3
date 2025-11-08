<template>
  <div class="death-report">
    <!-- Age at Death by Gender -->
    <v-row v-if="data.ageAtDeath && data.ageAtDeath.length > 0">
      <v-col cols="12">
        <v-card>
          <v-card-title>Age at Death by Gender</v-card-title>
          <v-card-text>
            <v-table>
              <thead>
                <tr>
                  <th>Gender</th>
                  <th>Min</th>
                  <th>P10</th>
                  <th>P25</th>
                  <th>Median</th>
                  <th>P75</th>
                  <th>P90</th>
                  <th>Max</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stat in data.ageAtDeath" :key="stat.category">
                  <td>{{ stat.category }}</td>
                  <td>{{ stat.minValue }}</td>
                  <td>{{ stat.p10Value }}</td>
                  <td>{{ stat.p25Value }}</td>
                  <td><strong>{{ stat.medianValue }}</strong></td>
                  <td>{{ stat.p75Value }}</td>
                  <td>{{ stat.p90Value }}</td>
                  <td>{{ stat.maxValue }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Death by Type -->
    <v-row v-if="data.deathByType && data.deathByType.length > 0">
      <v-col cols="12">
        <ChartSection title="Death by Type">
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
        <ChartSection title="Death Prevalence by Month">
          <MultiLineChart
            :data="data.prevalenceByMonth"
            x-axis-label="Month"
            y-axis-label="Prevalence per 1000 People"
            data-testid="prevalence-by-month-chart"
          />
        </ChartSection>
      </v-col>
    </v-row>

    <!-- Prevalence by Gender, Age, Year -->
    <v-row v-if="data.prevalenceByGenderAgeYear && data.prevalenceByGenderAgeYear.series.length > 0">
      <v-col cols="12">
        <ChartSection title="Death Prevalence by Gender, Age Group, and Year">
          <MultiLineChart
            :data="data.prevalenceByGenderAgeYear"
            x-axis-label="Year"
            y-axis-label="Prevalence per 1000 People"
            data-testid="prevalence-by-gender-age-year-chart"
          />
        </ChartSection>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import type { DeathReport } from '@/models/datasource.types'
import ChartSection from './shared/ChartSection.vue'
import PieChart from '@/components/reports/charts/PieChart.vue'
import MultiLineChart from './charts/MultiLineChart.vue'

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
