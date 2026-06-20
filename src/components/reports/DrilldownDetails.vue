<!--
  DrilldownDetails Component

  Displays detailed drill-down analytics when a concept is selected from a treemap.
  Sections are selected per-domain via DOMAIN_DRILLDOWN_FIELDS.
-->
<template>
  <div class="drilldown-details">
    <v-overlay
      :model-value="loading"
      contained
      class="align-center justify-center"
    >
      <AtlasProgressCircular
        indeterminate
        size="64"
        color="primary"
      />
    </v-overlay>

    <v-card
      v-if="showHeader"
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
        <AtlasIconButton
          icon="mdi-close"
          v-bind="{ ariaLabel: 'Close' }"
          variant="text"
          size="sm"
          @click="$emit('close')"
        />
      </v-card-title>
    </v-card>

    <AtlasRow
      v-if="!loading && data"
      class="drilldown-details__chart-grid"
    >
      <template
        v-for="field in fieldsForDomain"
        :key="field"
      >
        <AtlasCol
          v-if="field === 'prevalenceByGenderAgeYear' && data.prevalenceByGenderAgeYear"
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
                data-testid="drilldown-prevalenceByGenderAgeYear"
              />
            </v-card-text>
          </v-card>
        </AtlasCol>

        <AtlasCol
          v-else-if="
            field === 'prevalenceByMonth' &&
              data.prevalenceByMonth &&
              data.prevalenceByMonth.length > 0
          "
          cols="12"
          :md="compact ? 12 : 6"
        >
          <v-card elevation="2">
            <v-card-title class="text-h6 pb-2">
              Prevalence by Month
            </v-card-title>
            <v-card-text>
              <LineChart
                :data="formatTimeSeriesData(data.prevalenceByMonth)"
                :height="400"
                data-testid="drilldown-prevalenceByMonth"
              />
            </v-card-text>
          </v-card>
        </AtlasCol>

        <AtlasCol
          v-else-if="
            field === 'ageAtFirstOccurrence' &&
              data.ageAtFirstOccurrence &&
              data.ageAtFirstOccurrence.length > 0
          "
          cols="12"
          :md="compact ? 12 : 6"
        >
          <v-card elevation="2">
            <v-card-title class="text-h6 pb-2">
              Age at First Occurrence
            </v-card-title>
            <v-card-text>
              <BoxPlotChart
                :data="data.ageAtFirstOccurrence"
                :height="400"
                data-testid="drilldown-ageAtFirstOccurrence"
              />
            </v-card-text>
          </v-card>
        </AtlasCol>

        <AtlasCol
          v-else-if="field === 'lengthOfEra' && data.lengthOfEra && data.lengthOfEra.length > 0"
          cols="12"
          :md="compact ? 12 : 6"
        >
          <v-card elevation="2">
            <v-card-title class="text-h6 pb-2">
              Length of Era
            </v-card-title>
            <v-card-text>
              <BoxPlotChart
                :data="data.lengthOfEra"
                :height="400"
                data-testid="drilldown-lengthOfEra"
              />
            </v-card-text>
          </v-card>
        </AtlasCol>

        <AtlasCol
          v-else-if="field === 'byType' && data.byType && data.byType.length > 0"
          cols="12"
          :md="compact ? 12 : 6"
        >
          <v-card elevation="2">
            <v-card-title class="text-h6 pb-2">
              Distribution by Type
            </v-card-title>
            <v-card-text>
              <PieChart
                :data="data.byType"
                :height="400"
                data-testid="drilldown-byType"
              />
            </v-card-text>
          </v-card>
        </AtlasCol>

        <AtlasCol
          v-else-if="field === 'byUnit' && data.byUnit && data.byUnit.length > 0"
          cols="12"
          :md="compact ? 12 : 6"
        >
          <v-card elevation="2">
            <v-card-title class="text-h6 pb-2">
              Distribution by Unit
            </v-card-title>
            <v-card-text>
              <PieChart
                :data="data.byUnit"
                :height="400"
                data-testid="drilldown-byUnit"
              />
            </v-card-text>
          </v-card>
        </AtlasCol>

        <AtlasCol
          v-else-if="
            field === 'byValueAsConcept' &&
              data.byValueAsConcept &&
              data.byValueAsConcept.length > 0
          "
          cols="12"
          :md="compact ? 12 : 6"
        >
          <v-card elevation="2">
            <v-card-title class="text-h6 pb-2">
              Distribution by Value
            </v-card-title>
            <v-card-text>
              <PieChart
                :data="data.byValueAsConcept"
                :height="400"
                data-testid="drilldown-byValueAsConcept"
              />
            </v-card-text>
          </v-card>
        </AtlasCol>

        <AtlasCol
          v-else-if="field === 'byOperator' && data.byOperator && data.byOperator.length > 0"
          cols="12"
          :md="compact ? 12 : 6"
        >
          <v-card elevation="2">
            <v-card-title class="text-h6 pb-2">
              Distribution by Operator
            </v-card-title>
            <v-card-text>
              <PieChart
                :data="data.byOperator"
                :height="400"
                data-testid="drilldown-byOperator"
              />
            </v-card-text>
          </v-card>
        </AtlasCol>

        <AtlasCol
          v-else-if="field === 'byQualifier' && data.byQualifier && data.byQualifier.length > 0"
          cols="12"
          :md="compact ? 12 : 6"
        >
          <v-card elevation="2">
            <v-card-title class="text-h6 pb-2">
              Distribution by Qualifier
            </v-card-title>
            <v-card-text>
              <PieChart
                :data="data.byQualifier"
                :height="400"
                data-testid="drilldown-byQualifier"
              />
            </v-card-text>
          </v-card>
        </AtlasCol>

        <AtlasCol
          v-else-if="field === 'byFrequency' && data.byFrequency"
          cols="12"
          :md="compact ? 12 : 6"
        >
          <v-card elevation="2">
            <v-card-title class="text-h6 pb-2">
              Frequency Distribution
            </v-card-title>
            <v-card-text>
              <BarChart
                :data="data.byFrequency"
                :height="400"
                data-testid="drilldown-byFrequency"
              />
            </v-card-text>
          </v-card>
        </AtlasCol>
      </template>

      <AtlasCol
        v-if="!hasAnyData"
        cols="12"
      >
        <AtlasAlert severity="info">
          No detailed data available for this concept.
        </AtlasAlert>
      </AtlasCol>
    </AtlasRow>
  </div>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasCol, AtlasIconButton, AtlasProgressCircular, AtlasRow } from '@/components/ui'
import { computed } from 'vue'
import type { DrilldownReport, TimeSeriesData, LineChartData } from '@/models/report.types'
import {
  DOMAIN_DRILLDOWN_FIELDS,
  type Domain,
  type DrilldownField,
} from '@/config/drilldown-config'
import TrellisChart from '@/components/ui/charts/AtlasTrellisChart.vue'
import BoxPlotChart from '@/components/ui/charts/AtlasBoxPlotChart.vue'
import LineChart from './charts/LineChart.vue'
import PieChart from './charts/PieChart.vue'
import BarChart from './charts/BarChart.vue'

interface Props {
  data: DrilldownReport | null
  loading?: boolean
  conceptName: string
  conceptPath?: string
  domain?: Domain
  showHeader?: boolean
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  conceptPath: '',
  domain: 'condition',
  showHeader: true,
  compact: false,
})

defineEmits<{
  close: []
}>()

const fieldsForDomain = computed<DrilldownField[]>(() => {
  return DOMAIN_DRILLDOWN_FIELDS[props.domain] || []
})

const hasAnyData = computed(() => {
  if (!props.data) return false
  return fieldsForDomain.value.some(f => {
    const v = (props.data as unknown as Record<string, unknown>)[f]
    if (Array.isArray(v)) return v.length > 0
    if (v && typeof v === 'object' && 'series' in (v as object)) {
      return (v as { series: unknown[] }).series.length > 0
    }
    return Boolean(v)
  })
})

function formatTimeSeriesData(timeSeriesData: TimeSeriesData[]): LineChartData {
  return {
    xAxis: timeSeriesData.map(d => d.date),
    yAxis: timeSeriesData.map(d => d.value),
    seriesName: 'Prevalence per 1000 people',
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

/* Vertical separation between chart cards. Default v-col padding
 * gives ~24px between rows, which isn't enough to keep the title
 * of the next chart clear of the x-axis labels of the chart above
 * (especially when those x-axis labels are rotated). Add an extra
 * 16px so the gap is comfortable. */
.drilldown-details__chart-grid {
  row-gap: 16px;
}

.drilldown-details__chart-grid :deep(.v-col) {
  padding-bottom: 12px;
  padding-top: 12px;
}
</style>
