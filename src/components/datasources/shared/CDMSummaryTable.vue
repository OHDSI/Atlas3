<template>
  <SurfaceCard
    class="cdm-summary-table"
    padding="none"
  >
    <div class="cdm-summary-table__title">
      {{ t('dataSources.dashboardReport.cdmSummary', 'CDM Summary') }}
    </div>
    <v-table
      density="comfortable"
      class="cdm-summary-table__table"
    >
      <tbody>
        <tr>
          <td class="font-weight-medium">
            {{ t('columns.sourceName', 'Source Name') }}
          </td>
          <td>{{ data.sourceName }}</td>
        </tr>
        <tr>
          <td class="font-weight-medium">
            {{ t('dataSources.numberOfPeople', 'Number of People') }}
          </td>
          <td>{{ formatNumber(data.personCount) }}</td>
        </tr>
      </tbody>
    </v-table>
  </SurfaceCard>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { formatNumber } from '@/utils/datasource-formatters'
import SurfaceCard from '@/components/shared/SurfaceCard.vue'

const { t } = useI18n()

interface Props {
  data: {
    sourceName: string
    personCount: number
  }
}

defineProps<Props>()
</script>

<style scoped>
.cdm-summary-table__title {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  padding: 16px 20px 8px;
}

.cdm-summary-table__table {
  background: transparent;
}

.cdm-summary-table :deep(td) {
  padding: 12px 20px !important;
}

.cdm-summary-table :deep(td:first-child) {
  width: 40%;
}
</style>
