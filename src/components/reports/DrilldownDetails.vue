<!--
  DrilldownDetails Component

  Displays detailed drill-down analytics when a concept is selected from a treemap
-->
<template>
  <div class="drilldown-details">
    <!-- Loading overlay -->
    <v-overlay
      :model-value="loading"
      contained
      class="align-center justify-center"
    >
      <v-progress-circular
        indeterminate
        size="64"
        color="primary"
      />
    </v-overlay>

    <!-- Header -->
    <v-card
      class="detail-header mb-4"
      elevation="2"
    >
      <v-card-title class="d-flex justify-space-between align-center">
        <div>
          <h3 class="text-h5">
            {{ conceptName }}
          </h3>
          <p class="text-caption text-grey mt-1">
            {{ conceptPath }}
          </p>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="$emit('close')"
        />
      </v-card-title>
    </v-card>

    <!-- Charts Grid -->
    <v-row v-if="!loading && data">
      <!-- Prevalence by Gender/Age/Year - Trellis Chart -->
      <v-col
        v-if="data.prevalenceByGenderAgeYear"
        cols="12"
      >
        <v-card elevation="2">
          <v-card-title class="text-h6 pb-2">
            Prevalence by Gender, Age, and Year
          </v-card-title>
          <v-card-text>
            <TrellisChart
              :data="data.prevalenceByGenderAgeYear"
              :height="600"
            />
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Prevalence by Month - Line Chart -->
      <v-col
        v-if="data.prevalenceByMonth && data.prevalenceByMonth.length > 0"
        cols="12"
        md="6"
      >
        <v-card elevation="2">
          <v-card-title class="text-h6 pb-2">
            Prevalence by Month
          </v-card-title>
          <v-card-text>
            <LineChart
              :data="formatTimeSeriesData(data.prevalenceByMonth)"
              :height="400"
            />
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Age at First Occurrence - Box Plot -->
      <v-col
        v-if="data.ageAtFirstOccurrence && data.ageAtFirstOccurrence.length > 0"
        cols="12"
        md="6"
      >
        <v-card elevation="2">
          <v-card-title class="text-h6 pb-2">
            Age at First Occurrence
          </v-card-title>
          <v-card-text>
            <BoxPlotChart
              :data="data.ageAtFirstOccurrence"
              :height="400"
            />
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Length of Era - Box Plot -->
      <v-col
        v-if="data.lengthOfEra && data.lengthOfEra.length > 0"
        cols="12"
        md="6"
      >
        <v-card elevation="2">
          <v-card-title class="text-h6 pb-2">
            Length of Era
          </v-card-title>
          <v-card-text>
            <BoxPlotChart
              :data="data.lengthOfEra"
              :height="400"
            />
          </v-card-text>
        </v-card>
      </v-col>

      <!-- By Type - Pie Chart -->
      <v-col
        v-if="data.byType && data.byType.length > 0"
        cols="12"
        md="6"
      >
        <v-card elevation="2">
          <v-card-title class="text-h6 pb-2">
            Distribution by Type
          </v-card-title>
          <v-card-text>
            <PieChart
              :data="data.byType"
              :height="400"
            />
          </v-card-text>
        </v-card>
      </v-col>

      <!-- No data message -->
      <v-col
        v-if="!hasAnyData"
        cols="12"
      >
        <v-alert
          type="info"
          variant="tonal"
        >
          No detailed data available for this concept.
        </v-alert>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DrilldownReport, TimeSeriesData, LineChartData } from '@/models/report.types'
import TrellisChart from './charts/TrellisChart.vue'
import BoxPlotChart from './charts/BoxPlotChart.vue'
import LineChart from './charts/LineChart.vue'
import PieChart from './charts/PieChart.vue'

interface Props {
  data: DrilldownReport | null
  loading?: boolean
  conceptName: string
  conceptPath: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

defineEmits<{
  close: []
}>()

/**
 * Check if any data is available
 */
const hasAnyData = computed(() => {
  if (!props.data) return false

  return !!(
    (props.data.prevalenceByGenderAgeYear && props.data.prevalenceByGenderAgeYear.series.length > 0) ||
    (props.data.prevalenceByMonth && props.data.prevalenceByMonth.length > 0) ||
    (props.data.ageAtFirstOccurrence && props.data.ageAtFirstOccurrence.length > 0) ||
    (props.data.lengthOfEra && props.data.lengthOfEra.length > 0) ||
    (props.data.byType && props.data.byType.length > 0)
  )
})

/**
 * Format time series data for LineChart component
 */
function formatTimeSeriesData(timeSeriesData: TimeSeriesData[]): LineChartData {
  return {
    xAxis: timeSeriesData.map(d => d.date),
    yAxis: timeSeriesData.map(d => d.value),
    seriesName: 'Prevalence per 1000 people'
  }
}
</script>

<style scoped>
.drilldown-details {
  width: 100%;
  padding: 16px;
  position: relative;
}

.detail-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
}
</style>
