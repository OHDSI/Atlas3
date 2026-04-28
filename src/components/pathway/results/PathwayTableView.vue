<template>
  <div class="pathway-tables">
    <section>
      <h3>{{ t('pathway.results.allPathways', 'All Pathways') }}</h3>
      <button
        class="export-btn"
        @click="exportCsv(allRows, 'all')"
      >
        {{ t('common.export', 'Export CSV') }}
      </button>
      <table>
        <thead>
          <tr>
            <th
              v-for="h in headerOf(allRows)"
              :key="h"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, i) in allRows"
            :key="i"
          >
            <td
              v-for="h in headerOf(allRows)"
              :key="h"
            >
              {{ r[h] }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h3>{{ t('pathway.results.countsByRank', 'Counts by Rank') }}</h3>
      <button
        class="export-btn"
        @click="exportCsv(rankRows, 'rank')"
      >
        {{ t('common.export', 'Export CSV') }}
      </button>
      <table>
        <thead>
          <tr>
            <th
              v-for="h in headerOf(rankRows)"
              :key="h"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, i) in rankRows"
            :key="i"
          >
            <td
              v-for="h in headerOf(rankRows)"
              :key="h"
            >
              {{ r[h] }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h3>{{ t('pathway.results.eventCohortCounts', 'Event Cohort Counts') }}</h3>
      <button
        class="export-btn"
        @click="exportCsv(cohortCountRows, 'cohort-counts')"
      >
        {{ t('common.export', 'Export CSV') }}
      </button>
      <table>
        <thead>
          <tr>
            <th
              v-for="h in headerOf(cohortCountRows)"
              :key="h"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, i) in cohortCountRows"
            :key="i"
          >
            <td
              v-for="h in headerOf(cohortCountRows)"
              :key="h"
            >
              {{ r[h] }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h3>{{ t('columns.distinctEventCohorts', 'Distinct Event Cohort Counts') }}</h3>
      <button
        class="export-btn"
        @click="exportCsv(distinctRows, 'distinct')"
      >
        {{ t('common.export', 'Export CSV') }}
      </button>
      <table>
        <thead>
          <tr>
            <th
              v-for="h in headerOf(distinctRows)"
              :key="h"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, i) in distinctRows"
            :key="i"
          >
            <td
              v-for="h in headerOf(distinctRows)"
              :key="h"
            >
              {{ r[h] }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Pathway, PathwayResults } from '@/models/pathway.types'
import { useI18n } from '@/composables/useI18n'
import {
  toAllPathwaysRows,
  toCountsByRankRows,
  toEventCohortCountRows,
  toDistinctEventCountRows,
  toCsv,
  downloadCsv,
} from '@/utils/pathway-csv'

const props = defineProps<{
  design: Pathway
  results: PathwayResults
  targetCohortId: number
}>()

const { t } = useI18n()

const group = computed(() =>
  props.results.pathwayGroups.find(g => g.targetCohortId === props.targetCohortId)
)

const allRows = computed(() => group.value
  ? toAllPathwaysRows(group.value, props.results.eventCodes, props.design.maxDepth)
  : []
)
const rankRows = computed(() => group.value
  ? toCountsByRankRows(group.value, props.results.eventCodes) : []
)
const cohortCountRows = computed(() => group.value
  ? toEventCohortCountRows(group.value, props.results.eventCodes) : []
)
const distinctRows = computed(() => group.value
  ? toDistinctEventCountRows(group.value, props.results.eventCodes) : []
)

function headerOf(rows: ReadonlyArray<Record<string, string | number>>): string[] {
  return rows[0] ? Object.keys(rows[0]) : []
}

function exportCsv(rows: Array<Record<string, string | number>>, name: string): void {
  downloadCsv(`pathways-${props.targetCohortId}-${name}.csv`, toCsv(rows))
}
</script>

<style scoped>
.pathway-tables section { margin-bottom: 24px; }
.pathway-tables table { width: 100%; border-collapse: collapse; }
.pathway-tables th, .pathway-tables td { padding: 4px 8px; border-bottom: 1px solid #eee; text-align: left; }
.export-btn { margin-bottom: 8px; }
</style>
