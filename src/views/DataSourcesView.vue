<template>
  <page-shell
    hero
    compact
    eyebrow="OHDSI · CDM"
    :title="pageTitle"
    :subtitle="pageSubtitle"
  >
    <div class="datasources-view">
      <!-- Two-column layout: report-type sidebar on the left,
           main report content on the right. The compact source
           picker sits in the page header (#actions slot) so it's
           always visible without consuming vertical space. -->
      <DataSourceSidebar
        class="datasources-view__sidebar"
        :model-value="store.selectedReportType"
        :disabled="!store.selectedSourceId"
        @update:model-value="handleReportTypeChange"
      />

      <div class="datasources-view__main">
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
        <SurfaceCard
          v-else-if="store.selectedSource && store.selectedReportType && !store.error.report"
          class="datasources-view__report"
          padding="md"
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
        </SurfaceCard>

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
    </div>

    <template #actions>
      <DataSourceSelector
        :model-value="store.selectedSourceId"
        data-testid="datasource-selector"
        :data-sources="store.sources"
        :loading="store.loading.sources"
        class="datasources-view__source-picker"
        @update:model-value="handleSourceChange"
      />
    </template>
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
import SurfaceCard from '@/components/shared/SurfaceCard.vue'
import DataSourceSelector from '@/components/datasources/DataSourceSelector.vue'
import DataSourceSidebar from '@/components/datasources/DataSourceSidebar.vue'
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

const pageTitle = computed(() => t('dataSources.headingTitle', 'Data Sources').value)

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
  logger.debug('DataSourcesView', 'dataDensityData', {
    reportType: report?.type,
    hasData: !!report,
  })
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
    'observation',
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
        reportType: store.selectedReportType,
      },
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
        reportType,
      },
    })
  }
}

// Initialize from route params. Tolerates being called before
// store.sources has loaded — if the requested sourceKey isn't
// matched yet, the function exits early and is re-run by the
// watcher below once sources arrive.
async function initializeFromRoute() {
  if (props.sourceKey) {
    if (store.sources.length === 0) {
      // Sources not loaded yet; the watch on store.sources will
      // re-call this function once they arrive.
      return
    }
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

// Watch for route changes OR for the sources list arriving. Hard
// refreshes on /datasources/<key>/<type> hit a race where the route
// params arrive before fetchDataSources resolves; without a watch
// on store.sources the initial init silently no-ops and the page
// shows the empty state. Watching both fixes the reload bug.
watch(
  () => [props.sourceKey, props.reportType, store.sources.length],
  () => {
    initializeFromRoute()
  }
)

onMounted(async () => {
  await store.fetchDataSources()
  initializeFromRoute()
})
</script>

<style scoped>
.datasources-view {
  /* Two-column layout: report-type sidebar on the left, the
   * active report on the right. Falls back to stacked on narrow
   * viewports (sidebar collapses above the content). */
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 768px) {
  .datasources-view {
    grid-template-columns: 1fr;
  }
}

.datasources-view__sidebar {
  border-right: 1px solid rgb(var(--v-theme-outline-variant));
  /* Pull the rail to the bottom + leading edges of the page-shell
   * card so the separator line spans full card height beneath the
   * hero header. The top stays at zero so the sidebar starts below
   * the header instead of overlapping it. */
  margin-block: 0 -32px;
  margin-inline-start: -32px;
  padding-block: 0 24px;
  padding-inline-start: 16px;
  align-self: stretch;
  background: rgb(var(--v-theme-surface));
}

@media (max-width: 768px) {
  .datasources-view__sidebar {
    border-right: 0;
    border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
    margin-block: 0;
    margin-inline: -32px;
    padding-inline: 16px;
    padding-block: 16px;
  }
}

.datasources-view__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.datasources-view__source-picker {
  /* Compact source picker in the page header. The DataSourceSelector
   * is a v-select; constrain its width so it doesn't stretch. */
  min-width: 200px;
  max-width: 280px;
}

.datasources-view__alert {
  border-radius: 10px;
}

.datasources-view__skeleton {
  border-radius: 12px;
}

/* .datasources-view__report styling now comes from SurfaceCard. */

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
