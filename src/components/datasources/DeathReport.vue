<template>
  <div class="death-report">
    <!-- Age at Death by Gender -->
    <v-row v-if="data.ageAtDeath && data.ageAtDeath.length > 0">
      <v-col cols="12">
        <v-card>
          <v-card-title>{{ t('dataSources.deathReport.ageAtDeath', 'Age at Death') }}</v-card-title>
          <v-card-text>
            <v-table>
              <thead>
                <tr>
                  <th>{{ t('dataSources.deathReport.gender', 'Gender') }}</th>
                  <th>{{ t('common.min', 'Min') }}</th>
                  <th>{{ t('common.p10', 'P10') }}</th>
                  <th>{{ t('common.p25', 'P25') }}</th>
                  <th>{{ t('common.median', 'Median') }}</th>
                  <th>{{ t('common.p75', 'P75') }}</th>
                  <th>{{ t('common.p90', 'P90') }}</th>
                  <th>{{ t('common.max', 'Max') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="stat in data.ageAtDeath"
                  :key="stat.category"
                >
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

    <!-- Prevalence by Gender, Age, Year -->
    <v-row v-if="data.prevalenceByGenderAgeYear && data.prevalenceByGenderAgeYear.series.length > 0">
      <v-col cols="12">
        <ChartSection :title="t('dataSources.deathReport.deathPrevalenceByAgeGenderYear', 'Death Prevalence by Age, Gender, Year').value">
          <MultiLineChart
            :data="data.prevalenceByGenderAgeYear"
            :x-axis-label="t('dataSources.deathReport.yearOfObservation', 'Year of Observation').value"
            :y-axis-label="t('dataSources.deathReport.prevalencePer1000People', 'Prevalence Per 1000 People').value"
            data-testid="prevalence-by-gender-age-year-chart"
          />
        </ChartSection>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { DeathReport } from '@/models/datasource.types'
import ChartSection from './shared/ChartSection.vue'
import PieChart from '@/components/reports/charts/PieChart.vue'
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
