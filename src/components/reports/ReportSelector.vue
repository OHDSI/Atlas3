<!--
  ReportSelector Component - Dropdown selector for report types
-->
<template>
  <div class="report-selector">
    <v-select
      :model-value="modelValue"
      :items="reportItems"
      item-title="label"
      item-value="type"
      :label="tv('dataSources.selectAReport')"
      :disabled="disabled"
      variant="outlined"
      density="comfortable"
      prepend-inner-icon="mdi-chart-box"
      @update:model-value="handleChange"
    >
      <template #item="{ props: itemProps, item }">
        <v-list-item v-bind="itemProps">
          <template #prepend>
            <v-icon :icon="item.raw.icon" />
          </template>
          <v-list-item-title>{{ item.raw.label }}</v-list-item-title>
          <v-list-item-subtitle class="text-wrap">
            {{ item.raw.description }}
          </v-list-item-subtitle>
        </v-list-item>
      </template>
    </v-select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { ReportType } from '@/models/report.types'
import { isReportAvailable } from '@/config/report-analysis-mapping'

const { tv } = useI18n()

/**
 * Props
 */
const props = defineProps<{
  modelValue: ReportType | null
  disabled?: boolean
  completedAnalyses?: number[]
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  'update:modelValue': [value: ReportType | null]
}>()

/**
 * All report type definitions with metadata
 */
const allReportItems = [
  {
    type: 'person' as ReportType,
    label: tv('dataSources.reports.person'),
    description: tv('columns.description'),
    icon: 'mdi-account-group'
  },
  {
    type: 'condition-eras' as ReportType,
    label: tv('dataSources.reports.conditionEra'),
    description: tv('columns.description'),
    icon: 'mdi-medical-bag'
  },
  {
    type: 'drug-eras' as ReportType,
    label: tv('dataSources.reports.drugEra'),
    description: tv('columns.description'),
    icon: 'mdi-pill'
  },
  {
    type: 'cohort-specific' as ReportType,
    label: tv('reports.types.cohortSpecific.label'),
    description: tv('columns.description'),
    icon: 'mdi-chart-timeline-variant'
  },
  {
    type: 'condition' as ReportType,
    label: tv('dataSources.reports.conditionOccurrence'),
    description: tv('columns.description'),
    icon: 'mdi-hospital-box'
  },
  {
    type: 'conditions-by-index' as ReportType,
    label: tv('reports.types.conditionsByIndex.label'),
    description: tv('columns.description'),
    icon: 'mdi-calendar-clock'
  },
  {
    type: 'death' as ReportType,
    label: tv('dataSources.reports.death'),
    description: tv('columns.description'),
    icon: 'mdi-heart-pulse'
  },
  {
    type: 'drug-exposure' as ReportType,
    label: tv('dataSources.reports.drugExposure'),
    description: tv('columns.description'),
    icon: 'mdi-medication'
  },
  {
    type: 'drugs-by-index' as ReportType,
    label: tv('reports.types.drugsByIndex.label'),
    description: tv('columns.description'),
    icon: 'mdi-calendar-range'
  },
  {
    type: 'observation-periods' as ReportType,
    label: tv('dataSources.reports.observationPeriod'),
    description: tv('columns.description'),
    icon: 'mdi-calendar-multiple'
  },
  {
    type: 'procedure' as ReportType,
    label: tv('dataSources.reports.procedure'),
    description: tv('columns.description'),
    icon: 'mdi-medical-bag'
  },
  {
    type: 'procedures-by-index' as ReportType,
    label: tv('reports.types.proceduresByIndex.label'),
    description: tv('columns.description'),
    icon: 'mdi-calendar-check'
  },
  {
    type: 'data-completeness' as ReportType,
    label: tv('cohortDefinitions.costUtilization.reportManager.reportManagerText_3'),
    description: tv('columns.description'),
    icon: 'mdi-database-check'
  },
  {
    type: 'entropy' as ReportType,
    label: tv('reports.types.entropy.label'),
    description: tv('columns.description'),
    icon: 'mdi-chart-scatter-plot'
  },
  {
    type: 'tornado' as ReportType,
    label: tv('cohortDefinitions.costUtilization.reportManager.reportManagerText_22'),
    description: tv('columns.description'),
    icon: 'mdi-weather-tornado'
  },
  {
    type: 'persons-exposure-baseline' as ReportType,
    label: tv('options.reporting.personsAndExposureDuringBaselinePeriod'),
    description: tv('columns.description'),
    icon: 'mdi-account-clock'
  },
  {
    type: 'persons-exposure-cohort' as ReportType,
    label: tv('options.reporting.personsAndExposureDuringCohortPeriod'),
    description: tv('columns.description'),
    icon: 'mdi-account-group-outline'
  },
  {
    type: 'visits-baseline' as ReportType,
    label: tv('options.reporting.visitsDuringBaselinePeriod'),
    description: tv('columns.description'),
    icon: 'mdi-hospital-building'
  },
  {
    type: 'visit-dates-baseline' as ReportType,
    label: tv('options.reporting.visitDatesDuringBaselinePeriod'),
    description: tv('columns.description'),
    icon: 'mdi-calendar'
  },
  {
    type: 'care-site-visit-dates-baseline' as ReportType,
    label: tv('options.reporting.careSiteVisitDatesDuringBaselinePeriod'),
    description: tv('columns.description'),
    icon: 'mdi-domain'
  },
  {
    type: 'visits-cohort' as ReportType,
    label: tv('options.reporting.visitsDuringCohortPeriod'),
    description: tv('columns.description'),
    icon: 'mdi-hospital'
  },
  {
    type: 'visit-dates-cohort' as ReportType,
    label: tv('options.reporting.visitDatesDuringCohortPeriod'),
    description: tv('columns.description'),
    icon: 'mdi-calendar-month'
  },
  {
    type: 'care-site-visit-dates-cohort' as ReportType,
    label: tv('options.reporting.careSiteVisitDatesDuringCohortPeriod'),
    description: tv('columns.description'),
    icon: 'mdi-office-building'
  },
  {
    type: 'drug-utilization-baseline' as ReportType,
    label: tv('options.reporting.drugUtilizationDuringBaselinePeriod'),
    description: tv('columns.description'),
    icon: 'mdi-pill-multiple'
  },
  {
    type: 'drug-utilization-cohort' as ReportType,
    label: tv('options.reporting.drugUtilizationDuringCohortPeriod'),
    description: tv('columns.description'),
    icon: 'mdi-medication-outline'
  },
  {
    type: 'heracles-heel' as ReportType,
    label: tv('cohortDefinitions.cohortDefinitionManager.heraclesHeel'),
    description: tv('columns.description'),
    icon: 'mdi-alert-circle'
  }
]

/**
 * Filter report items based on completed analyses
 * Only show reports that have all required analyses completed
 */
const reportItems = computed(() => {
  // If no completed analyses provided, show all reports
  if (!props.completedAnalyses || props.completedAnalyses.length === 0) {
    return allReportItems
  }

  // Filter to only reports with completed data
  return allReportItems.filter(item =>
    isReportAvailable(item.type, props.completedAnalyses!)
  )
})

/**
 * Handle selection change
 */
function handleChange(value: ReportType | null) {
  emit('update:modelValue', value)
}
</script>

<style scoped>
.report-selector {
  width: 100%;
}
</style>
