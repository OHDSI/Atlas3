<!--
  RawResultTable

  Renders result rows that the mapper could not classify as prevalence or
  distribution — typically the output of a custom-SQL feature analysis that
  emits its own columns. Rather than dropping such rows, we show them
  verbatim: columns are derived dynamically from whatever keys the rows
  carry, so a spec-conformant custom SQL is always at least visible.

  This is intentionally a plain, shape-agnostic fallback. Purpose-built
  visualisations for categorical / series / cross-tab outputs come later;
  the contract this table honours is simply "never make custom output
  invisible".
-->
<template>
  <AtlasCard
    padding="none"
    class="raw-result-table"
    :data-testid="`char-results-raw-${analysisId}`"
  >
    <div class="raw-result-table__header">
      <div class="raw-result-table__eyebrow-row">
        <span class="text-eyebrow">{{ analysisName }}</span>
        <span class="raw-result-table__accent-rule" />
      </div>
      <h3 class="raw-result-table__title">
        {{ tv('characterizations.results.table.raw', 'Custom output') }}
        <span class="raw-result-table__count">({{ rows.length }})</span>
        <span
          v-if="hasCustomFe"
          class="raw-result-table__badge"
          :title="tv('characterizations.results.table.customFeHint',
                     'Produced by a custom-SQL feature analysis')"
        >
          {{ tv('characterizations.results.table.customFe', 'Custom SQL') }}
        </span>
      </h3>
    </div>

    <AtlasDataTable
      :items="tableRows"
      :headers="headers"
      :items-per-page="25"
      :items-per-page-options="[10, 25, 50, 100, -1]"
      class="raw-result-table__table"
      :data-testid="`char-results-raw-table-${analysisId}`"
    >
      <template #no-data>
        <div class="raw-result-table__empty">
          {{ tv('common.noData', 'No rows match the current filter.') }}
        </div>
      </template>
    </AtlasDataTable>
  </AtlasCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@/composables/useI18n'
import { AtlasCard, AtlasDataTable } from '@/components/ui'

interface Props {
  analysisId: number
  analysisName: string
  rows: Record<string, unknown>[]
}

const props = defineProps<Props>()
const { tv } = useI18n()

// Columns that live in the group header or are surfaced as a badge — hidden
// from the table body to avoid noise.
const HIDDEN_KEYS = new Set(['analysisId', 'analysisName', 'faType'])

// Well-known columns get a stable leading order; unknown (custom) columns
// follow, alphabetically, so the interesting bespoke output is easy to scan.
const PREFERRED_ORDER = [
  'covariateId',
  'covariateName',
  'covariateShortName',
  'conceptId',
  'conceptName',
  'domainId',
  'resultType',
  'cohortId',
  'cohortName',
  'strataId',
  'strataName',
]

const hasCustomFe = computed<boolean>(() =>
  props.rows.some(r => r.faType === 'CUSTOM_FE')
)

const columnKeys = computed<string[]>(() => {
  const seen = new Set<string>()
  for (const row of props.rows) {
    for (const key of Object.keys(row)) {
      if (!HIDDEN_KEYS.has(key)) seen.add(key)
    }
  }
  const preferred = PREFERRED_ORDER.filter(k => seen.has(k))
  const rest = Array.from(seen)
    .filter(k => !PREFERRED_ORDER.includes(k))
    .sort((a, b) => a.localeCompare(b))
  return [...preferred, ...rest]
})

const headers = computed(() =>
  columnKeys.value.map(key => ({
    title: humanize(key),
    key,
    align: 'start' as const,
  }))
)

const tableRows = computed<Record<string, string | number>[]>(() =>
  props.rows.map(row => {
    const flat: Record<string, string | number> = {}
    for (const key of columnKeys.value) {
      flat[key] = formatValue(row[key])
    }
    return flat
  })
)

function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function formatValue(value: unknown): string | number {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') {
    return Number.isInteger(value) && Math.abs(value) >= 1000
      ? value.toLocaleString()
      : value
  }
  if (typeof value === 'string' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
</script>

<style scoped>
.raw-result-table {
  margin-bottom: 16px;
}

.raw-result-table__header {
  padding: 20px 20px 12px;
}

.raw-result-table__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.raw-result-table__accent-rule {
  display: inline-block;
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}

.raw-result-table__title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 18px;
  font-weight: 500;
  line-height: 1.3;
  margin: 0;
  color: rgb(var(--v-theme-primary));
}

.raw-result-table__count {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-weight: 400;
}

.raw-result-table__badge {
  align-self: center;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 10px;
  color: rgb(var(--v-theme-orange));
  background: rgba(var(--v-theme-orange), 0.12);
}

.raw-result-table__empty {
  padding: 24px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
