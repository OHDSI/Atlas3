<!--
  ExplorePrevalenceDialog

  Detail view for a single covariate. Shows metadata (concept, domain,
  analysis) and a per-cohort comparison table with inline bar indicators.
-->
<template>
  <AtlasDialog
    :model-value="modelValue"
    :eyebrow="tv('components.characterizationResults.covariateDetail', 'COVARIATE DETAIL')"
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
            <dt>{{ tv('columns.analysis', 'Analysis') }}</dt>
            <dd>{{ stat.analysisName }}</dd>
          </div>
          <div v-if="stat.domainId">
            <dt>{{ tv('columns.domain', 'Domain') }}</dt>
            <dd>{{ stat.domainId }}</dd>
          </div>
          <div>
            <dt>{{ tv('columns.conceptId', 'Concept ID') }}</dt>
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
            <dt>{{ tv('components.characterizationResults.concept', 'Concept') }}</dt>
            <dd>{{ stat.conceptName }}</dd>
          </div>
        </dl>
      </div>

      <table class="explore__table">
        <thead>
          <tr>
            <th class="explore__th-label">
              {{ tv('common.cohort', 'Cohort') }}
            </th>
            <th class="explore__th-num">
              {{ tv('columns.count', 'Count') }}
            </th>
            <th class="explore__th-num">
              {{ tv('columns.pct', '%') }}
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
        {{ tv('components.characterizationResults.smdLabel', 'Standardised mean difference') }}: <strong>{{ stat.stdDiff.toFixed(4) }}</strong>
      </div>
    </template>

    <div
      v-else
      class="explore__empty"
    >
      {{ tv('components.characterizationResults.noCovariateSelected', 'No covariate selected.') }}
    </div>

    <template #actions>
      <AtlasButton
        variant="ghost"
        @click="close"
      >
        {{ tv('common.close', 'Close') }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasButton, AtlasDialog } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'
import { useConceptDetailDrawerStore } from '@/stores/concept-detail-drawer'
import { useDataSourcesStore } from '@/stores/datasources'
import type { PrevalenceStat } from '@/models/characterization.types'

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
</style>
