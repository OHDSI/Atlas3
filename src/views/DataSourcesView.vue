<template>
  <div class="page-wrapper">
    <div class="page-card">
      <v-container
        fluid
        class="datasources-view"
      >
        <!-- Page Header -->
        <v-row>
          <v-col cols="12">
            <div class="datasources-view__header">
              <h1 class="text-h4 mb-2">
                {{ t('dataSources.headingTitle', 'Data Sources') }}
              </h1>
              <p
                v-if="selectedSource && store.selectedReportType"
                class="text-subtitle-1 text-medium-emphasis"
              >
                {{ selectedSource.sourceName }} - {{ reportTypeLabel }}
              </p>
            </div>
          </v-col>
        </v-row>

        <!-- Selectors -->
        <v-row>
          <v-col
            cols="12"
            md="6"
          >
            <DataSourceSelector
              :model-value="store.selectedSourceId"
              data-testid="datasource-selector"
              :data-sources="store.sources"
              :loading="store.loading.sources"
              @update:model-value="handleSourceChange"
            />
          </v-col>
          <v-col
            cols="12"
            md="6"
          >
            <ReportTypeSelector
              :model-value="store.selectedReportType"
              data-testid="report-type-selector"
              :disabled="!store.selectedSourceId"
              @update:model-value="handleReportTypeChange"
            />
          </v-col>
        </v-row>

        <!-- Error State: Sources -->
        <v-row v-if="store.error.sources">
          <v-col cols="12">
            <v-alert
              type="error"
              variant="tonal"
            >
              <div class="d-flex align-center justify-space-between">
                <span>{{ store.error.sources }}</span>
                <v-btn
                  color="error"
                  variant="text"
                  @click="store.retryFetchSources"
                >
                  {{ t('common.retry', 'Retry') }}
                </v-btn>
              </div>
            </v-alert>
          </v-col>
        </v-row>

        <!-- Error State: Report -->
        <v-row v-if="store.error.report">
          <v-col cols="12">
            <v-alert
              type="error"
              variant="tonal"
            >
              <div class="d-flex align-center justify-space-between">
                <span>{{ store.error.report }}</span>
                <v-btn
                  color="error"
                  variant="text"
                  @click="store.retryFetchReport"
                >
                  {{ t('common.retry', 'Retry') }}
                </v-btn>
              </div>
            </v-alert>
          </v-col>
        </v-row>

        <!-- Loading State -->
        <v-row v-if="store.loading.report">
          <v-col cols="12">
            <v-skeleton-loader type="card" />
          </v-col>
        </v-row>

        <!-- Report Content -->
        <v-row v-else-if="store.selectedSource && store.selectedReportType && !store.error.report">
          <v-col cols="12">
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
              class="text-center py-8"
            >
              <v-icon
                icon="mdi-information-outline"
                size="48"
                class="mb-4"
              />
              <p class="text-body-1">
                Report type "{{ reportTypeLabel }}" is not yet implemented.
              </p>
            </div>
          </v-col>
        </v-row>

        <!-- Empty State -->
        <v-row v-else-if="!store.loading.sources && store.sources.length === 0">
          <v-col cols="12">
            <div class="text-center py-8">
              <v-icon
                icon="mdi-database-off"
                size="48"
                class="mb-4"
              />
              <p class="text-body-1">
                No data sources available.
              </p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useDataSourcesStore } from '@/stores/datasources'
import { REPORT_TYPE_LABELS, type ReportType } from '@/models/datasource.types'
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

const dashboardData = computed(() => {
  const report = store.currentReport
  console.log('[View] dashboardData:', { reportType: report?.type, hasData: !!report })
  if (report?.type === 'dashboard') {
    return report.data
  }
  return null
})

const dataDensityData = computed(() => {
  const report = store.currentReport
  console.log('[View] dataDensityData:', { reportType: report?.type, hasData: !!report })
  if (report?.type === 'datadensity') {
    return report.data
  }
  return null
})

const personData = computed(() => {
  const report = store.currentReport
  console.log('[View] personData:', { reportType: report?.type, hasData: !!report })
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
.page-wrapper {
  min-height: 100%;
  background-color: rgb(var(--v-theme-background));
  display: flex;
  padding: 32px;
  box-sizing: border-box;
}

.page-card {
  border-radius: 18px;
  padding: 30px;
  background-color: white;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.datasources-view__header {
  margin-bottom: 1rem;
}
</style>
