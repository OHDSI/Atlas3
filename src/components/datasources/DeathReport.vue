<template>
  <div class="death-report">
    <EmptyReportState
      v-if="!hasData"
      :title="t('dataSources.deathReport.noDataTitle', 'No death data available').value"
      :subtitle="
        t(
          'dataSources.deathReport.noDataSubtitle',
          'This data source has no death records to report on.'
        ).value
      "
    />

    <!-- Age at Death by Gender -->
    <AtlasRow v-if="data.ageAtDeath && data.ageAtDeath.length > 0">
      <AtlasCol cols="12">
        <ChartSection :title="t('dataSources.deathReport.ageAtDeath', 'Age at Death').value">
          <BoxPlotChart
            :data="data.ageAtDeath"
            :title="
              t('dataSources.deathReport.ageAtDeath', 'Age at Death Distribution by Gender').value
            "
            :height="400"
            data-testid="age-at-death-chart"
          />
        </ChartSection>
      </AtlasCol>
    </AtlasRow>

    <!-- Death by Type -->
    <AtlasRow v-if="data.deathByType && data.deathByType.length > 0">
      <AtlasCol cols="12">
        <ChartSection :title="t('dataSources.deathReport.deathByType', 'Death by Type').value">
          <PieChart
            :data="data.deathByType"
            data-testid="death-by-type-chart"
          />
        </ChartSection>
      </AtlasCol>
    </AtlasRow>

    <!-- Prevalence by Month -->
    <AtlasRow v-if="data.prevalenceByMonth && (data.prevalenceByMonth.categories ?? []).length > 0">
      <AtlasCol cols="12">
        <ChartSection
          :title="
            t('dataSources.deathReport.deathPrevalenceByMonth', 'Death Prevalence by Month').value
          "
        >
          <MultiLineChart
            :data="data.prevalenceByMonth"
            :x-axis-label="t('dataSources.deathReport.date', 'Date').value"
            :y-axis-label="
              t('dataSources.deathReport.prevalencePer1000People', 'Prevalence Per 1000 People')
                .value
            "
            data-testid="prevalence-by-month-chart"
          />
        </ChartSection>
      </AtlasCol>
    </AtlasRow>

    <!-- Prevalence by Gender, Age, Year (Trellis) -->
    <AtlasRow
      v-if="data.prevalenceByGenderAgeYear && data.prevalenceByGenderAgeYear.series.length > 0"
    >
      <AtlasCol cols="12">
        <ChartSection
          :title="
            t(
              'dataSources.deathReport.deathPrevalenceByAgeGenderYear',
              'Death Prevalence by Age, Gender, Year'
            ).value
          "
        >
          <TrellisChart
            :data="data.prevalenceByGenderAgeYear"
            :height="600"
            data-testid="prevalence-by-gender-age-year-chart"
          />
        </ChartSection>
      </AtlasCol>
    </AtlasRow>
  </div>
</template>

<script setup lang="ts">
import { AtlasCol, AtlasRow } from '@/components/ui'
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { DeathReport } from '@/models/datasource.types'
import ChartSection from './shared/ChartSection.vue'
import EmptyReportState from './shared/EmptyReportState.vue'
import PieChart from '@/components/reports/charts/PieChart.vue'
import BoxPlotChart from '@/components/ui/charts/AtlasBoxPlotChart.vue'
import TrellisChart from '@/components/ui/charts/AtlasTrellisChart.vue'
import MultiLineChart from './charts/MultiLineChart.vue'

const { t } = useI18n()

const props = defineProps<{
  data: DeathReport
}>()

const hasData = computed(() => {
  const d = props.data
  const sectionLengths = [
    d.ageAtDeath?.length,
    d.deathByType?.length,
    d.prevalenceByMonth?.categories?.length,
    d.prevalenceByGenderAgeYear?.series?.length,
  ]
  return sectionLengths.some(n => Boolean(n))
})
</script>

<style scoped>
.death-report {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
</style>
