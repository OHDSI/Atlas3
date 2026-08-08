<template>
  <AtlasCard
    class="clinical-domain-report"
    padding="none"
  >
    <nav class="page-tabs-rail clinical-domain-report__tabs-rail">
      <AtlasTabs
        v-model="activeTab"
        align-tabs="start"
        density="comfortable"
        color="primary"
        slider-color="primary"
        bg-color="transparent"
        class="page-tabs"
      >
        <AtlasTab value="treemap">
          <AtlasIcon
            start
            icon="mdi-chart-tree"
          />
          {{ t('dataSources.treemap.treemapTab', 'Treemap') }}
        </AtlasTab>
        <AtlasTab value="table">
          <AtlasIcon
            start
            icon="mdi-table"
          />
          {{ t('dataSources.table.tableTab', 'Table') }}
        </AtlasTab>
      </AtlasTabs>
    </nav>

    <div class="clinical-domain-report__body">
      <v-window v-model="activeTab">
        <v-window-item value="treemap">
          <DomainPrevalenceTreemap
            :data="data.prevalenceData.treemapNodes"
            @node-click="handleNodeClick"
          />
        </v-window-item>

        <v-window-item value="table">
          <DomainPrevalenceTable
            :data="data.prevalenceData.tableRows"
            :metric-label="metricLabel"
            @row-click="handleTableRowClick"
          />
        </v-window-item>
      </v-window>

      <!-- Drill-down details, shared by both tabs. Render while LOADING too
           so the progress overlay inside DrilldownDetails is visible
           immediately on click — without v-if=loading the component would
           only mount once the network request returned data, leaving the
           user with no feedback. -->
      <DrilldownDetails
        v-if="drilldownData || drilldownLoading"
        :data="drilldownData"
        :loading="drilldownLoading"
        :concept-name="selectedConceptName"
        :concept-path="selectedConceptPath"
        :domain="drilldownDomain"
        @close="clearDrilldown"
      />
    </div>
  </AtlasCard>
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
import { AtlasCard, AtlasIcon, AtlasTab, AtlasTabs } from '@/components/ui'
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
    const result = await getCDMDrilldown(selectedSource.sourceKey, domain, conceptId)

    if (result.success) {
      drilldownData.value = mapDrilldownReport(
        result.data,
        conceptId,
        conceptName,
        conceptPath,
        domain
      )
    } else {
      logger.error('ClinicalDomainReport', 'Failed to fetch drill-down data', result.error)
    }
  } catch (error) {
    logger.error('ClinicalDomainReport', 'Failed to fetch drill-down data', error)
  } finally {
    drilldownLoading.value = false
  }
}

// Table rows only carry the display name (see PrevalenceTableRow), not the
// full "||"-delimited hierarchy path the treemap nodes have, so pass an
// empty path — DrilldownDetails treats it as optional breadcrumb text.
function handleTableRowClick(conceptId: number, conceptName: string) {
  handleNodeClick(conceptId, conceptName, '')
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
