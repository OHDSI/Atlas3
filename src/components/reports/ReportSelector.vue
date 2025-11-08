<!--
  ReportSelector Component
  Feature: 005-cohort-reports
  Tasks: T035-T037

  Dropdown selector for report types with metadata
-->
<template>
  <div class="report-selector">
    <v-select
      :model-value="modelValue"
      :items="reportItems"
      item-title="label"
      item-value="type"
      label="Select Report Type"
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
import type { ReportType } from '@/models/report.types'

/**
 * Props
 */
defineProps<{
  modelValue: ReportType | null
  disabled?: boolean
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  'update:modelValue': [value: ReportType | null]
}>()

/**
 * Report type definitions with metadata
 */
const reportItems = [
  {
    type: 'person' as ReportType,
    label: 'Person (Demographics)',
    description: 'Year of birth and demographic distributions',
    icon: 'mdi-account-group'
  },
  {
    type: 'condition-eras' as ReportType,
    label: 'Condition Eras',
    description: 'Condition prevalence and duration analysis',
    icon: 'mdi-medical-bag'
  },
  {
    type: 'drug-eras' as ReportType,
    label: 'Drug Eras',
    description: 'Drug exposure prevalence and duration',
    icon: 'mdi-pill'
  },
  {
    type: 'cohort-specific' as ReportType,
    label: 'Cohort Specific',
    description: 'Cohort timeline and distribution analytics',
    icon: 'mdi-chart-timeline-variant'
  },
  {
    type: 'condition' as ReportType,
    label: 'Condition Occurrence',
    description: 'Individual condition occurrences',
    icon: 'mdi-hospital-box'
  },
  {
    type: 'conditions-by-index' as ReportType,
    label: 'Conditions by Index',
    description: 'Conditions relative to cohort start',
    icon: 'mdi-calendar-clock'
  },
  {
    type: 'death' as ReportType,
    label: 'Death',
    description: 'Mortality data and causes',
    icon: 'mdi-heart-pulse'
  },
  {
    type: 'drug-exposure' as ReportType,
    label: 'Drug Exposure',
    description: 'Individual drug exposure events',
    icon: 'mdi-medication'
  },
  {
    type: 'drugs-by-index' as ReportType,
    label: 'Drugs by Index',
    description: 'Drug exposures relative to cohort start',
    icon: 'mdi-calendar-range'
  },
  {
    type: 'observation-periods' as ReportType,
    label: 'Observation Periods',
    description: 'Patient observation period coverage',
    icon: 'mdi-calendar-multiple'
  },
  {
    type: 'procedure' as ReportType,
    label: 'Procedure Occurrence',
    description: 'Procedure events and frequency',
    icon: 'mdi-medical-bag'
  },
  {
    type: 'procedures-by-index' as ReportType,
    label: 'Procedures by Index',
    description: 'Procedures relative to cohort start',
    icon: 'mdi-calendar-check'
  },
  {
    type: 'data-completeness' as ReportType,
    label: 'Data Completeness',
    description: 'Data quality metrics',
    icon: 'mdi-database-check'
  },
  {
    type: 'entropy' as ReportType,
    label: 'Entropy',
    description: 'Data entropy analysis',
    icon: 'mdi-chart-scatter-plot'
  },
  {
    type: 'tornado' as ReportType,
    label: 'Tornado',
    description: 'Tornado diagram visualization',
    icon: 'mdi-weather-tornado'
  },
  {
    type: 'persons-exposure-baseline' as ReportType,
    label: 'Persons/Exposure (Baseline)',
    description: 'Baseline period persons and exposures',
    icon: 'mdi-account-clock'
  },
  {
    type: 'persons-exposure-cohort' as ReportType,
    label: 'Persons/Exposure (Cohort)',
    description: 'Cohort period persons and exposures',
    icon: 'mdi-account-group-outline'
  },
  {
    type: 'visits-baseline' as ReportType,
    label: 'Visits (Baseline)',
    description: 'Baseline period visit data',
    icon: 'mdi-hospital-building'
  },
  {
    type: 'visit-dates-baseline' as ReportType,
    label: 'Visit Dates (Baseline)',
    description: 'Baseline visit date distribution',
    icon: 'mdi-calendar'
  },
  {
    type: 'care-site-visit-dates-baseline' as ReportType,
    label: 'Care Site Visit Dates (Baseline)',
    description: 'Baseline care site visit patterns',
    icon: 'mdi-domain'
  },
  {
    type: 'visits-cohort' as ReportType,
    label: 'Visits (Cohort)',
    description: 'Cohort period visit data',
    icon: 'mdi-hospital'
  },
  {
    type: 'visit-dates-cohort' as ReportType,
    label: 'Visit Dates (Cohort)',
    description: 'Cohort visit date distribution',
    icon: 'mdi-calendar-month'
  },
  {
    type: 'care-site-visit-dates-cohort' as ReportType,
    label: 'Care Site Visit Dates (Cohort)',
    description: 'Cohort care site visit patterns',
    icon: 'mdi-office-building'
  },
  {
    type: 'drug-utilization-baseline' as ReportType,
    label: 'Drug Utilization (Baseline)',
    description: 'Baseline drug utilization patterns',
    icon: 'mdi-pill-multiple'
  },
  {
    type: 'drug-utilization-cohort' as ReportType,
    label: 'Drug Utilization (Cohort)',
    description: 'Cohort drug utilization patterns',
    icon: 'mdi-medication-outline'
  },
  {
    type: 'heracles-heel' as ReportType,
    label: 'Heracles Heel',
    description: 'Data quality Achilles Heel results',
    icon: 'mdi-alert-circle'
  }
]

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
