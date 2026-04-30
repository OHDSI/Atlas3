<template>
  <page-shell
    hero
    eyebrow="OHDSI · CDM"
    :title="pageTitle"
    :subtitle="pageSubtitle"
  >
    <div class="datasources-view">
      <!-- Compact selectors toolbar -->
      <div class="datasources-view__toolbar">
        <div class="datasources-view__selector">
          <DataSourceSelector
            :model-value="store.selectedSourceId"
            data-testid="datasource-selector"
            :data-sources="store.sources"
            :loading="store.loading.sources"
            @update:model-value="handleSourceChange"
          />
        </div>
        <div class="datasources-view__selector">
          <ReportTypeSelector
            :model-value="store.selectedReportType"
            data-testid="report-type-selector"
            :disabled="!store.selectedSourceId"
            @update:model-value="handleReportTypeChange"
          />
        </div>
      </div>

      <!-- Error State: Sources -->
      <v-alert
        v-if="store.error.sources"
        type="error"
        variant="tonal"
        density="compact"
        class="datasources-view__alert"
      >
        <div class="d-flex align-center justify-space-between">
          <span>{{ store.error.sources }}</span>
          <v-btn
            color="error"
            variant="text"
            size="small"
            @click="store.retryFetchSources"
          >
            {{ t('common.retry', 'Retry') }}
          </v-btn>
        </div>
      </v-alert>

      <!-- Error State: Report -->
      <v-alert
        v-if="store.error.report"
        type="error"
        variant="tonal"
        density="compact"
        class="datasources-view__alert"
      >
        <div class="d-flex align-center justify-space-between">
          <span>{{ store.error.report }}</span>
          <v-btn
            color="error"
            variant="text"
            size="small"
            @click="store.retryFetchReport"
          >
            {{ t('common.retry', 'Retry') }}
          </v-btn>
        </div>
      </v-alert>

      <!-- Loading State -->
      <v-skeleton-loader
        v-if="store.loading.report"
        type="card"
        class="datasources-view__skeleton"
      />

      <!-- Report Content -->
      <div
        v-else-if="store.selectedSource && store.selectedReportType && !store.error.report"
        class="datasources-view__report"
      >
        <DashboardReport
          v-if="store.selectedReportType === 'dashboard' && dashboardData"
          data-testid="dashboard-report"
          :data="dashboardData"
        />

        <DataDensityReport
          v-else-if="store.selectedReportType === 'datadensity' && dataDensityData"
          data-testid="datadensity-report"
          :data="dataDensityData"
        />

        <PersonReport
          v-else-if="store.selectedReportType === 'person' && personData"
          data-testid="person-report"
          :data="personData"
        />

        <ObservationPeriodReport
          v-else-if="store.selectedReportType === 'observationPeriod' && observationPeriodData"
          data-testid="observation-period-report"
          :data="observationPeriodData"
        />

        <DeathReport
          v-else-if="store.selectedReportType === 'death' && deathData"
          data-testid="death-report"
          :data="deathData"
        />

        <ClinicalDomainReport
          v-else-if="isClinicalDomainReport && clinicalData"
          data-testid="clinical-domain-report"
          :data="clinicalData"
          :report-type="store.selectedReportType"
        />

        <div
          v-else
          class="datasources-view__empty"
        >
          <v-icon
            icon="mdi-information-outline"
            size="36"
            class="datasources-view__empty-icon"
          />
          <p class="datasources-view__empty-text">
            Report type "{{ reportTypeLabel }}" is not yet implemented.
          </p>
        </div>
      </div>

      <!-- Empty State: no sources -->
      <div
        v-else-if="!store.loading.sources && store.sources.length === 0 && !store.error.sources"
        class="datasources-view__empty"
      >
        <v-icon
          icon="mdi-database-off"
          size="36"
          class="datasources-view__empty-icon"
        />
        <p class="datasources-view__empty-text">
          No data sources available.
        </p>
      </div>

      <!-- Idle hint when sources are loaded but nothing selected -->
      <div
        v-else-if="!store.loading.sources && store.sources.length > 0 && !store.selectedSource"
        class="datasources-view__empty"
      >
        <v-icon
          icon="mdi-database-arrow-down-outline"
          size="36"
          class="datasources-view__empty-icon"
        />
        <p class="datasources-view__empty-text">
          Select a data source to view its reports.
        </p>
      </div>
    </div>
  </page-shell>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useDataSourcesStore } from '@/stores/datasources'
import { logger } from '@/utils/logger'
import { REPORT_TYPE_LABELS, type ReportType } from '@/models/datasource.types'
import PageShell from '@/components/shared/PageShell.vue'
import DataSourceSelector from '@/components/datasources/DataSourceSelector.vue'
import ReportTypeSelector from '@/components/datasources/ReportTypeSelector.vue'
import DashboardReport from '@/components/datasources/DashboardReport.vue'
import DataDensityReport from '@/components/datasources/DataDensityReport.vue'
import PersonReport from '@/components/datasources/PersonReport.vue'
import ObservationPeriodReport from '@/components/datasources/ObservationPeriodReport.vue'
import DeathReport from '@/components/datasources/DeathReport.vue'
import ClinicalDomainReport from '@/components/datasources/ClinicalDomainReport.vue'

const router = useRouter()
const store = useDataSourcesStore()
const { t } = useI18n()

// Get props from route
interface Props {
  sourceKey?: string
  reportType?: string
}

const props = defineProps<Props>()

const selectedSource = computed(() => store.selectedSource)

const reportTypeLabel = computed(() => {
  if (!store.selectedReportType) return ''
  return REPORT_TYPE_LABELS[store.selectedReportType]
})

const pageTitle = computed(() =>
  t('dataSources.headingTitle', 'Data Sources').value
)

const pageSubtitle = computed(() => {
  if (selectedSource.value && store.selectedReportType) {
    return `${selectedSource.value.sourceName} — ${reportTypeLabel.value}`
  }
  return t(
    'dataSources.pageSubtitle',
    'Browse CDM data sources and run pre-built reports against them.'
  ).value
})

const dashboardData = computed(() => {
  const report = store.currentReport
  logger.debug('DataSourcesView', 'dashboardData', { reportType: report?.type, hasData: !!report })
  if (report?.type === 'dashboard') {
    return report.data
  }
  return null
})

const dataDensityData = computed(() => {
  const report = store.currentReport
  logger.debug('DataSourcesView', 'dataDensityData', { reportType: report?.type, hasData: !!report })
  if (report?.type === 'datadensity') {
    return report.data
  }
  return null
})

const personData = computed(() => {
  const report = store.currentReport
  logger.debug('DataSourcesView', 'personData', { reportType: report?.type, hasData: !!report })
  if (report?.type === 'person') {
    return report.data
  }
  return null
})

const observationPeriodData = computed(() => {
  const report = store.currentReport
  if (report?.type === 'observationPeriod') {
    return report.data
  }
  return null
})

const deathData = computed(() => {
  const report = store.currentReport
  if (report?.type === 'death') {
    return report.data
  }
  return null
})

const clinicalData = computed(() => {
  const report = store.currentReport
  if (report?.type === 'clinical') {
    return report.data
  }
  return null
})

const isClinicalDomainReport = computed(() => {
  if (!store.selectedReportType) return false
  const clinicalReports: ReportType[] = [
    'visit',
    'conditionOccurrence',
    'conditionEra',
    'procedure',
    'drugExposure',
    'drugEra',
    'measurement',
    'observation'
  ]
  return clinicalReports.includes(store.selectedReportType)
})

function handleSourceChange(sourceId: number | null) {
  if (sourceId === null) return

  // Don't call store.selectDataSource here since it will be called by initializeFromRoute
  // Just update the URL and let the watcher handle it
  const source = store.sources.find(s => s.sourceId === sourceId)
  if (source && store.selectedReportType) {
    router.push({
      name: 'datasources',
      params: {
        sourceKey: source.sourceKey,
        reportType: store.selectedReportType
      }
    })
  }
}

function handleReportTypeChange(reportType: ReportType | null) {
  if (reportType === null) return

  // Don't call store.selectReportType here since it will be called by initializeFromRoute
  // Just update the URL and let the watcher handle it
  const source = store.selectedSource
  if (source) {
    router.push({
      name: 'datasources',
      params: {
        sourceKey: source.sourceKey,
        reportType
      }
    })
  }
}

// Initialize from route params
async function initializeFromRoute() {
  if (props.sourceKey) {
    const source = store.sources.find(s => s.sourceKey === props.sourceKey)
    if (source && source.sourceId !== store.selectedSourceId) {
      await store.selectDataSource(source.sourceId)
    }
  }

  if (props.reportType && props.reportType !== store.selectedReportType) {
    await store.selectReportType(props.reportType as ReportType)
  } else if (!props.reportType && !store.selectedReportType) {
    // Default to dashboard if no report type specified
    await store.selectReportType('dashboard')
  }
}

// Watch for route changes
watch(() => [props.sourceKey, props.reportType], () => {
  initializeFromRoute()
})

onMounted(async () => {
  await store.fetchDataSources()
  initializeFromRoute()
})
</script>

<style scoped>
.datasources-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.datasources-view__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.datasources-view__selector {
  flex: 1 1 280px;
  max-width: 360px;
  min-width: 240px;
}

.datasources-view__alert {
  border-radius: 10px;
}

.datasources-view__skeleton {
  border-radius: 12px;
}

.datasources-view__report {
  background: rgb(var(--v-theme-surface));
  border-radius: 12px;
  padding: 20px;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 2px 6px rgba(15, 23, 42, 0.04);
}

.datasources-view__empty {
  /* MD3 "filled" container — surface-variant tint, no border or
   * dashed line. The fill alone signals "this is a placeholder
   * region." */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 24px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface-variant));
}

.datasources-view__empty-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
}

.datasources-view__empty-text {
  margin: 0;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
  text-align: center;
}
</style>
