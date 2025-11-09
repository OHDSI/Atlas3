<template>
  <div class="clinical-domain-report">
    <v-card variant="outlined">
      <v-tabs v-model="activeTab" bg-color="grey-lighten-4">
        <v-tab value="treemap">
          <v-icon icon="mdi-chart-tree" class="mr-2" />
          {{ t('common.treemap', 'Treemap') }}
        </v-tab>
        <v-tab value="table">
          <v-icon icon="mdi-table" class="mr-2" />
          {{ t('common.table', 'Table') }}
        </v-tab>
      </v-tabs>

      <v-card-text class="pa-6">
        <v-window v-model="activeTab">
          <v-window-item value="treemap">
            <DomainPrevalenceTreemap :data="data.prevalenceData.treemapNodes" />
          </v-window-item>

          <v-window-item value="table">
            <DomainPrevalenceTable
              :data="data.prevalenceData.tableRows"
              :metric-label="metricLabel"
            />
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { ClinicalDomainReport as ClinicalDomainReportData, ReportType } from '@/models/datasource.types'
import { getMetricLabel } from '@/utils/datasource-formatters'
import DomainPrevalenceTreemap from '@/components/datasources/DomainPrevalenceTreemap.vue'
import DomainPrevalenceTable from '@/components/datasources/DomainPrevalenceTable.vue'

const { t } = useI18n()

interface Props {
  data: ClinicalDomainReportData
  reportType: ReportType
}

const props = defineProps<Props>()

const activeTab = ref('treemap')

const metricLabel = computed(() => getMetricLabel(props.reportType))
</script>

<style scoped>
.clinical-domain-report {
  width: 100%;
}
</style>
