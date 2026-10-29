<template>
  <div class="pathway-tables">
    <PathwayCohortSection
      v-for="g in groups"
      :key="g.group.targetCohortId"
      :cohort-name="g.cohortName"
      :testid="`pathway-cohort-tables-${g.group.targetCohortId}`"
    >
      <section
        v-for="s in g.sections"
        :key="s.key"
      >
        <h3>{{ s.title }}</h3>
        <button
          class="export-btn"
          @click="exportCsv(g.group.targetCohortId, s.rows, s.key)"
        >
          {{ t('common.exportCsv') }}
        </button>
        <table>
          <thead>
            <tr>
              <th
                v-for="h in headerOf(s.rows)"
                :key="h"
              >
                {{ h }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(r, i) in s.rows"
              :key="i"
            >
              <td
                v-for="h in headerOf(s.rows)"
                :key="h"
              >
                {{ r[h] }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </PathwayCohortSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Pathway, PathwayResults } from '@/models/pathway.types'
import { useI18n } from '@/composables/useI18n'
import { resolveCohortName } from '@/components/pathway/pathway-workbench-state'
import PathwayCohortSection from './PathwayCohortSection.vue'
import {
  toAllPathwaysRows,
  toCountsByRankRows,
  toEventCohortCountRows,
  toDistinctEventCountRows,
  toCsv,
  downloadCsv,
} from '@/utils/pathway-csv'

type Row = Record<string, string | number>

const props = defineProps<{
  design: Pathway
  results: PathwayResults
}>()

const { t, tv } = useI18n()

const groups = computed(() =>
  props.results.pathwayGroups.map(group => ({
    group,
    cohortName: resolveCohortName(props.design, group.targetCohortId),
    sections: [
      {
        key: 'all',
        title: tv('pathway.results.allPathways'),
        rows: toAllPathwaysRows(group, props.results.eventCodes, props.design.maxDepth) as Row[],
      },
      {
        key: 'rank',
        title: tv('pathway.results.countsByRank'),
        rows: toCountsByRankRows(group, props.results.eventCodes) as Row[],
      },
      {
        key: 'cohort-counts',
        title: tv('pathway.results.eventCohortCounts'),
        rows: toEventCohortCountRows(group, props.results.eventCodes) as Row[],
      },
      {
        key: 'distinct',
        title: tv('pathway.results.distinctEventCohortCounts'),
        rows: toDistinctEventCountRows(group, props.results.eventCodes) as Row[],
      },
    ],
  }))
)

function headerOf(rows: ReadonlyArray<Row>): string[] {
  return rows[0] ? Object.keys(rows[0]) : []
}

function exportCsv(targetCohortId: number, rows: Row[], name: string): void {
  downloadCsv(`pathways-${targetCohortId}-${name}.csv`, toCsv(rows))
}
</script>
<style scoped>
.pathway-tables section {
  margin-bottom: 24px;
  overflow-x: auto;
}
.pathway-tables table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13px;
}
.pathway-tables th,
.pathway-tables td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--atlas-color-outline);
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}
.pathway-tables th {
  font-weight: 600;
  background: var(--atlas-color-surface-variant);
  position: sticky;
  top: 0;
}
.export-btn {
  margin-bottom: 8px;
}
</style>
