<!--
  ExplorePrevalenceDialog

  Detail view for a single covariate. Shows metadata (concept, domain,
  analysis) and a per-cohort comparison table with inline bar indicators.
-->
<template>
  <AtlasDialog
    :model-value="modelValue"
    :eyebrow="tv('components.characterizationResults.covariateDetail')"
    :title="stat?.covariateName ?? ''"
    max-width="720"
    data-testid="char-results-explore-dialog"
    @close="close"
    @update:model-value="onUpdateModel"
  >
    <template v-if="stat">
      <div class="explore__meta">
        <dl class="explore__dl">
          <div>
            <dt>{{ tv('columns.analysis') }}</dt>
            <dd>{{ stat.analysisName }}</dd>
          </div>
          <div v-if="stat.domainId">
            <dt>{{ tv('columns.domain') }}</dt>
            <dd>{{ stat.domainId }}</dd>
          </div>
          <div>
            <dt>{{ tv('columns.conceptId') }}</dt>
            <dd>
              <a
                v-if="stat.conceptId"
                href="#"
                class="explore__link"
                @click.prevent="openConcept(stat.conceptId)"
              >{{ stat.conceptId }}</a>
              <span v-else>—</span>
            </dd>
          </div>
          <div v-if="stat.conceptName">
            <dt>{{ tv('components.characterizationResults.concept') }}</dt>
            <dd>{{ stat.conceptName }}</dd>
          </div>
        </dl>
      </div>

      <table class="explore__table">
        <thead>
          <tr>
            <th class="explore__th-label">
              {{ tv('common.cohort') }}
            </th>
            <th class="explore__th-num">
              {{ tv('columns.count') }}
            </th>
            <th class="explore__th-num">
              {{ tv('columns.pct') }}
            </th>
            <th class="explore__th-bar" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in cohortRows"
            :key="row.id"
          >
            <td class="explore__td-label">
              {{ row.name }}
            </td>
            <td class="explore__td-num">
              {{ row.count != null ? row.count.toLocaleString() : '—' }}
            </td>
            <td class="explore__td-num">
              {{ row.pct != null ? row.pct.toFixed(2) + '%' : '—' }}
            </td>
            <td class="explore__td-bar">
              <div
                class="explore__bar"
                :style="{ width: barWidth(row.pct) }"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <div
        v-if="stat.stdDiff != null"
        class="explore__stddiff"
      >
        {{ tv('components.characterizationResults.smdLabel') }}: <strong>{{ stat.stdDiff.toFixed(4) }}</strong>
      </div>

      <section
        v-if="temporalCohorts.length > 0 && activeTemporal"
        class="explore__temporal"
        data-testid="char-results-explore-temporal"
      >
        <h4 class="explore__temporal-title">
          {{ tv('components.characterizationResults.temporalTitle') }}
        </h4>
        <AtlasTabs
          v-if="temporalCohorts.length > 1"
          v-model="selectedCohortKey"
          data-testid="char-results-explore-temporal-cohorts"
        >
          <AtlasTab
            v-for="cohort in temporalCohorts"
            :key="cohort.key"
            :value="cohort.key"
            :data-testid="`char-results-explore-temporal-cohort-${cohort.key}`"
          >
            {{ cohort.name }}
          </AtlasTab>
        </AtlasTabs>
        <AtlasTabs
          v-model="selectedView"
          data-testid="char-results-explore-temporal-views"
        >
          <AtlasTab
            v-for="view in temporalViews"
            :key="view"
            :value="view"
            :data-testid="`char-results-explore-temporal-view-${view}`"
          >
            {{ view === 'annual' ? tv('components.characterizationResults.annual') : tv('components.characterizationResults.daily') }}
          </AtlasTab>
        </AtlasTabs>

        <div class="explore__temporal-scroll">
          <table
            class="explore__table"
            :data-testid="`char-results-explore-temporal-${selectedView}-table`"
          >
            <thead>
              <tr>
                <template v-if="selectedView === 'annual'">
                  <th class="explore__th-label">
                    {{ tv('components.characterizationResults.year') }}
                  </th>
                </template>
                <template v-else>
                  <th class="explore__th-label">
                    {{ tv('columns.startDay') }}
                  </th>
                  <th class="explore__th-label">
                    {{ tv('columns.endDay') }}
                  </th>
                </template>
                <th class="explore__th-num">
                  {{ tv('columns.count') }}
                </th>
                <th class="explore__th-num">
                  {{ tv('columns.pct') }}
                </th>
                <th class="explore__th-bar" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in temporalRows"
                :key="row.key"
              >
                <td
                  v-for="(label, index) in row.labels"
                  :key="index"
                  class="explore__td-label"
                >
                  {{ label }}
                </td>
                <td class="explore__td-num">
                  {{ row.count.toLocaleString() }}
                </td>
                <td class="explore__td-num">
                  {{ row.pct.toFixed(2) }}%
                </td>
                <td class="explore__td-bar">
                  <div
                    class="explore__bar"
                    :style="{ width: temporalBarWidth(row.pct) }"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <div
      v-else
      class="explore__empty"
    >
      {{ tv('components.characterizationResults.noCovariateSelected') }}
    </div>

    <template #actions>
      <AtlasButton
        variant="ghost"
        @click="close"
      >
        {{ tv('common.close') }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AtlasButton, AtlasDialog, AtlasTab, AtlasTabs } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'
import { useConceptDetailDrawerStore } from '@/stores/concept-detail-drawer'
import { useDataSourcesStore } from '@/stores/datasources'
import type { CohortTemporalData, PrevalenceStat } from '@/models/characterization.types'

interface Props {
  modelValue: boolean
  stat: PrevalenceStat | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { tv } = useI18n()
const conceptDrawer = useConceptDetailDrawerStore()
const dsStore = useDataSourcesStore()

async function openConcept(id: number): Promise<void> {
  if (dsStore.sources.length === 0) {
    try { await dsStore.fetchDataSources() } catch { /* ignore */ }
  }
  const sourceKey = dsStore.sources[0]?.sourceKey
  if (sourceKey) conceptDrawer.open(sourceKey, id)
}

interface CohortRow {
  id: number
  name: string
  count: number | null
  pct: number | null
}

function pickStratum(rec: Record<string, Record<string, number>>): Record<string, number> | null {
  const keys = Object.keys(rec)
  if (keys.length === 0) return null
  const k = keys.includes(DEFAULT_STRATA_KEY) ? DEFAULT_STRATA_KEY : keys[0]!
  return rec[k] ?? null
}

const cohortRows = computed<CohortRow[]>(() => {
  if (!props.stat) return []
  const countMap = pickStratum(props.stat.count)
  const pctMap = pickStratum(props.stat.pct)
  return props.stat.cohorts.map(c => ({
    id: c.id,
    name: c.name,
    count: countMap?.[String(c.id)] ?? null,
    pct: pctMap?.[String(c.id)] ?? null,
  }))
})

const maxPct = computed(() => {
  let m = 0
  for (const r of cohortRows.value) {
    if (r.pct != null && r.pct > m) m = r.pct
  }
  return m || 1
})

function barWidth(pct: number | null): string {
  if (pct == null || pct <= 0) return '0%'
  return `${Math.min((pct / maxPct.value) * 100, 100)}%`
}

type TemporalView = 'annual' | 'daily'

interface TemporalCohort {
  key: string
  name: string
  data: CohortTemporalData
}

interface TemporalRow {
  key: string
  labels: (string | number)[]
  count: number
  pct: number
}

// Cohorts in report order; the temporal map may also hold cohorts the
// report no longer lists, so those are appended by id.
const temporalCohorts = computed<TemporalCohort[]>(() => {
  const byCohort = props.stat?.temporalByCohort ?? {}
  const named = new Map((props.stat?.cohorts ?? []).map(c => [String(c.id), c.name]))
  const keys = [
    ...Array.from(named.keys()).filter(key => byCohort[key]),
    ...Object.keys(byCohort).filter(key => !named.has(key)),
  ]
  return keys.map(key => ({ key, name: named.get(key) ?? key, data: byCohort[key]! }))
})

const selectedCohortKey = ref<string | null>(null)
const selectedView = ref<TemporalView>('annual')

const activeTemporal = computed(() =>
  temporalCohorts.value.find(c => c.key === selectedCohortKey.value) ?? temporalCohorts.value[0]
)

const temporalViews = computed<TemporalView[]>(() => {
  const data = activeTemporal.value?.data
  if (!data) return []
  return [
    ...(data.temporalAnnual.length > 0 ? ['annual' as const] : []),
    ...(data.temporal.length > 0 ? ['daily' as const] : []),
  ]
})

watch(() => props.stat, () => {
  selectedCohortKey.value = temporalCohorts.value[0]?.key ?? null
}, { immediate: true })

watch(temporalViews, views => {
  if (!views.includes(selectedView.value)) selectedView.value = views[0] ?? 'annual'
}, { immediate: true })

// WebAPI's temporal `avg` is a proportion; show it as a percentage like `pct`.
const temporalRows = computed<TemporalRow[]>(() => {
  const data = activeTemporal.value?.data
  if (!data) return []
  if (selectedView.value === 'annual') {
    return data.temporalAnnual.map(item => ({
      key: String(item.year),
      labels: [item.year],
      count: item.count,
      pct: item.avg * 100,
    }))
  }
  return data.temporal.map(item => ({
    key: `${item.startDay}:${item.endDay}`,
    labels: [item.startDay, item.endDay],
    count: item.count,
    pct: item.avg * 100,
  }))
})

const maxTemporalPct = computed(() => Math.max(0, ...temporalRows.value.map(row => row.pct)) || 1)

function temporalBarWidth(pct: number): string {
  if (pct <= 0) return '0%'
  return `${Math.min((pct / maxTemporalPct.value) * 100, 100)}%`
}

function close(): void {
  emit('update:modelValue', false)
}

function onUpdateModel(value: boolean): void {
  emit('update:modelValue', value)
}
</script>

<style scoped>
.explore__meta {
  margin-bottom: 20px;
  padding: 16px;
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 8px;
}
.explore__dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
  margin: 0;
}
.explore__dl dt {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-bottom: 2px;
}
.explore__dl dd {
  margin: 0;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
}
.explore__link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.explore__link:hover {
  text-decoration: underline;
}
.explore__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.explore__th-label,
.explore__td-label {
  text-align: left;
  padding: 8px 12px;
}
.explore__th-num,
.explore__td-num {
  text-align: right;
  padding: 8px 12px;
  white-space: nowrap;
}
.explore__th-bar {
  width: 40%;
  padding: 8px 12px;
}
.explore__td-bar {
  padding: 8px 12px;
}
.explore__bar {
  height: 14px;
  background: rgb(var(--v-theme-primary));
  border-radius: 3px;
  opacity: 0.7;
  min-width: 2px;
  transition: width 0.3s ease;
}
.explore__table thead {
  border-bottom: 2px solid rgb(var(--v-theme-outline));
}
.explore__table tbody tr {
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.3);
}
.explore__table th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.explore__stddiff {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 8px;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.explore__empty {
  padding: 48px 24px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.explore__temporal {
  margin-top: 24px;
}
.explore__temporal-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}
.explore__temporal-scroll {
  max-height: 320px;
  margin-top: 8px;
  overflow-y: auto;
}
.explore__temporal-scroll thead th {
  position: sticky;
  top: 0;
  background: rgb(var(--v-theme-surface));
}
</style>
