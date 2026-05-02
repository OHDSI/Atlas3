<template>
  <SurfaceCard
    class="clinical-domain-report"
    padding="none"
  >
    <nav class="page-tabs-rail clinical-domain-report__tabs-rail">
      <v-tabs
        v-model="activeTab"
        align-tabs="start"
        density="comfortable"
        color="primary"
        slider-color="primary"
        bg-color="transparent"
        class="page-tabs"
      >
        <v-tab value="treemap">
          <v-icon
            start
            icon="mdi-chart-tree"
          />
          {{ t('dataSources.treemap.treemapTab', 'Treemap') }}
        </v-tab>
        <v-tab value="table">
          <v-icon
            start
            icon="mdi-table"
          />
          {{ t('dataSources.table.tableTab', 'Table') }}
        </v-tab>
      </v-tabs>
    </nav>

    <div class="clinical-domain-report__body">
      <v-window v-model="activeTab">
        <v-window-item value="treemap">
          <DomainPrevalenceTreemap
            :data="data.prevalenceData.treemapNodes"
            @node-click="handleNodeClick"
          />

          <!-- Drill-down details. Render while LOADING too so the
               progress overlay inside DrilldownDetails is visible
               immediately on click — without v-if=loading the
               component would only mount once the network request
               returned data, leaving the user with no feedback. -->
          <DrilldownDetails
            v-if="drilldownData || drilldownLoading"
            :data="drilldownData"
            :loading="drilldownLoading"
            :concept-name="selectedConceptName"
            :concept-path="selectedConceptPath"
            :domain="drilldownDomain"
            @close="clearDrilldown"
          />
        </v-window-item>

        <v-window-item value="table">
          <DomainPrevalenceTable
            :data="data.prevalenceData.tableRows"
            :metric-label="metricLabel"
          />
        </v-window-item>
      </v-window>
    </div>
  </SurfaceCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useDataSourcesStore } from '@/stores/datasources'
import type {
  ClinicalDomainReport as ClinicalDomainReportData,
  ReportType,
} from '@/models/datasource.types'
import type { DrilldownReport } from '@/models/report.types'
import type { Domain } from '@/config/drilldown-config'
import { getMetricLabel } from '@/utils/datasource-formatters'
import { getCDMDrilldown } from '@/services/webapi'
import { mapDrilldownReport } from '@/services/report-mapper'
import { logger } from '@/utils/logger'
import SurfaceCard from '@/components/shared/SurfaceCard.vue'
import DomainPrevalenceTreemap from '@/components/datasources/DomainPrevalenceTreemap.vue'
import DomainPrevalenceTable from '@/components/datasources/DomainPrevalenceTable.vue'
import DrilldownDetails from '@/components/reports/DrilldownDetails.vue'

const { t } = useI18n()
const store = useDataSourcesStore()

interface Props {
  data: ClinicalDomainReportData
  reportType: ReportType
}

const props = defineProps<Props>()

const activeTab = ref('treemap')

const metricLabel = computed(() => getMetricLabel(props.reportType))

const drilldownDomain = computed<Domain>(() => {
  const map: Partial<Record<ReportType, Domain>> = {
    conditionOccurrence: 'condition',
    conditionEra: 'conditionEra',
    drugExposure: 'drug',
    drugEra: 'drugEra',
    measurement: 'measurement',
    observation: 'observation',
    procedure: 'procedure',
    visit: 'visit',
  }
  return map[props.reportType] ?? 'condition'
})

const drilldownData = ref<DrilldownReport | null>(null)
const drilldownLoading = ref(false)
const selectedConceptName = ref('')
const selectedConceptPath = ref('')

function getDomainFromReportType(reportType: ReportType): string {
  const domainMap: Record<string, string> = {
    visit: 'visit',
    conditionOccurrence: 'condition',
    conditionEra: 'conditionera',
    procedure: 'procedure',
    drugExposure: 'drug',
    drugEra: 'drugera',
    measurement: 'measurement',
    observation: 'observation',
  }
  return domainMap[reportType] || reportType
}

async function handleNodeClick(conceptId: number, conceptName: string, conceptPath: string) {
  const selectedSource = store.selectedSource
  if (!selectedSource) {
    logger.warn('ClinicalDomainReport', 'No source selected for drill-down')
    return
  }

  selectedConceptName.value = conceptName
  selectedConceptPath.value = conceptPath
  drilldownLoading.value = true
  drilldownData.value = null

  try {
    const domain = getDomainFromReportType(props.reportType)
    const rawData = await getCDMDrilldown(selectedSource.sourceKey, domain, conceptId)

    if (rawData) {
      drilldownData.value = mapDrilldownReport(rawData, conceptId, conceptName, conceptPath, domain)
    }
  } catch (error) {
    logger.error('ClinicalDomainReport', 'Failed to fetch drill-down data', error)
  } finally {
    drilldownLoading.value = false
  }
}

function clearDrilldown() {
  drilldownData.value = null
  selectedConceptName.value = ''
  selectedConceptPath.value = ''
}
</script>

<style scoped>
.clinical-domain-report {
  width: 100%;
}

.clinical-domain-report__tabs-rail {
  /* Pull rail flush to card edges; keep the bottom-border separator. */
  margin: 0;
}

.clinical-domain-report__body {
  padding: 24px;
}
</style>
