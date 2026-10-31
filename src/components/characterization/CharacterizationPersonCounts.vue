<template>
  <AtlasCard
    v-if="rows.length > 0"
    padding="md"
    class="char-person-counts"
    data-testid="char-person-counts"
  >
    <h3 class="char-person-counts__title">
      {{ tv('components.characterizationResults.personsAnalyzed') }}
    </h3>
    <div class="char-person-counts__wrap">
      <table class="char-person-counts__table">
        <thead>
          <tr>
            <th class="char-person-counts__label">
              {{ tv('common.cohort') }}
            </th>
            <th
              v-for="column in columns"
              :key="column.key"
              :data-testid="`char-person-counts-col-${column.key}`"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.cohortId"
            :data-testid="`char-person-counts-row-${row.cohortId}`"
          >
            <td class="char-person-counts__label">
              {{ row.name }}
            </td>
            <td
              v-for="column in columns"
              :key="column.key"
            >
              {{ row.counts[column.key] ?? '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </AtlasCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { AtlasCard } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { LinkedCohort, StrataCounts } from '@/models/characterization.types'

const OVERALL_STRATA_ID = '0'

const props = withDefaults(defineProps<{
  strataCounts: StrataCounts
  cohorts: LinkedCohort[]
  strataNames?: Record<string, string>
}>(), { strataNames: () => ({}) })

const { tv } = useI18n()

const columns = computed(() => {
  const strataIds = new Set<string>()
  for (const byStrata of Object.values(props.strataCounts)) {
    for (const strataId of Object.keys(byStrata)) {
      if (strataId !== OVERALL_STRATA_ID) strataIds.add(strataId)
    }
  }
  const strata = Array.from(strataIds)
    .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b))
    .map(key => ({ key, label: props.strataNames[key] ?? key }))
  return [{ key: OVERALL_STRATA_ID, label: tv('components.characterizationTable1.overall') }, ...strata]
})

const rows = computed(() => {
  const known = new Map(props.cohorts.map(cohort => [String(cohort.id), cohort.name]))
  const cohortIds = [
    ...props.cohorts.map(cohort => String(cohort.id)).filter(id => id in props.strataCounts),
    ...Object.keys(props.strataCounts).filter(id => !known.has(id)),
  ]
  return cohortIds.map(cohortId => {
    const counts: Record<string, string> = {}
    for (const [strataId, n] of Object.entries(props.strataCounts[cohortId] ?? {})) {
      if (Number.isFinite(n)) counts[strataId] = n.toLocaleString()
    }
    return { cohortId, name: known.get(cohortId) ?? cohortId, counts }
  })
})
</script>

<style scoped>
.char-person-counts__title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin: 0 0 8px;
}
.char-person-counts__wrap { overflow-x: auto; }
.char-person-counts__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
.char-person-counts__table th,
.char-person-counts__table td {
  padding: 4px 8px;
  text-align: right;
  white-space: nowrap;
}
.char-person-counts__table th {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.15);
}
.char-person-counts__table .char-person-counts__label {
  text-align: left;
  white-space: normal;
}
</style>
