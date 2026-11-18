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
          @click="exportCsv(g.group.targetCohortId, filteredRows(s.id, s.rows), s.key)"
        >
          {{ t('common.exportCsv') }}
        </button>
        <div
          v-if="textColumnsOf(s.rows).length > 0"
          class="pathway-table-filters"
        >
          <AtlasTextField
            v-for="h in textColumnsOf(s.rows)"
            :key="h"
            :model-value="filterOf(s.id)[h] ?? ''"
            :label="tv('pathway.results.filterColumn', { column: h })"
            prepend-icon="mdi-filter-variant"
            hide-details
            clearable
            :data-test="`pathway-table-filter-${s.key}-${h}`"
            @update:model-value="(v: string | number) => setFilter(s.id, h, v)"
          />
        </div>
        <AtlasDataTable
          v-model:sort-by="sortByOf(s.id).value"
          :headers="headersOf(s.rows)"
          :items="filteredRows(s.id, s.rows)"
          :items-per-page="25"
          :no-data-text="tv('pathway.results.noMatchingRows')"
          :data-test="`pathway-table-${s.key}`"
        />
      </section>
    </PathwayCohortSection>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, type Ref } from 'vue'
import type { Pathway, PathwayResults } from '@/models/pathway.types'
import { useI18n } from '@/composables/useI18n'
import { resolveCohortName } from '@/components/pathway/pathway-workbench-state'
import PathwayCohortSection from './PathwayCohortSection.vue'
import { AtlasDataTable, AtlasTextField } from '@/components/ui'
import { matchesTerms } from '@/utils/list-filters'
import {
  toAllPathwaysRows,
  toCountsByRankRows,
  toEventCohortCountRows,
  toDistinctEventCountRows,
  toCsv,
  downloadCsv,
} from '@/utils/pathway-csv'

type Row = Record<string, string | number>
interface SortItem {
  key: string
  order?: 'asc' | 'desc'
}

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
    ].map(section => ({ ...section, id: `${group.targetCohortId}:${section.key}` })),
  }))
)

const DEFAULT_SORT: Record<string, SortItem[]> = {
  all: [{ key: 'Count', order: 'desc' }],
  'cohort-counts': [{ key: 'Count', order: 'desc' }],
}

const filters = reactive<Record<string, Record<string, string>>>({})
const sorts = new Map<string, Ref<SortItem[]>>()

function columnsOf(rows: ReadonlyArray<Row>): string[] {
  return rows[0] ? Object.keys(rows[0]) : []
}

function textColumnsOf(rows: ReadonlyArray<Row>): string[] {
  return columnsOf(rows).filter(h => rows.some(r => typeof r[h] === 'string'))
}

// Column names such as "% with Pathway" are not safe as v-data-table item
// paths, so each header reads its cell through an explicit accessor.
function headersOf(rows: ReadonlyArray<Row>) {
  return columnsOf(rows).map(h => ({
    key: h,
    title: h,
    value: (item: unknown) => (item as Row)[h],
  }))
}

function filterOf(sectionId: string): Record<string, string> {
  return filters[sectionId] ?? {}
}

function setFilter(sectionId: string, column: string, value: string | number | null): void {
  filters[sectionId] = { ...filterOf(sectionId), [column]: value == null ? '' : String(value) }
}

function filteredRows(sectionId: string, rows: Row[]): Row[] {
  const active = Object.entries(filterOf(sectionId)).filter(([, q]) => q.trim() !== '')
  if (active.length === 0) return rows
  return rows.filter(r => active.every(([h, q]) => matchesTerms([String(r[h] ?? '')], q)))
}

function sortByOf(sectionId: string): Ref<SortItem[]> {
  let sort = sorts.get(sectionId)
  if (!sort) {
    const key = sectionId.slice(sectionId.indexOf(':') + 1)
    sort = ref<SortItem[]>([...(DEFAULT_SORT[key] ?? [])])
    sorts.set(sectionId, sort)
  }
  return sort
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
.pathway-table-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.pathway-table-filters > * {
  flex: 1 1 160px;
  max-width: 240px;
}
.export-btn {
  margin-bottom: 8px;
}
</style>
