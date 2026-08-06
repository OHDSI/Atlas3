<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  AtlasDialog,
  AtlasProgressCircular,
  AtlasTextField,
  AtlasSelect,
  AtlasSnackbar,
} from '@/components/ui'
import ConceptAddOptions from '@/components/concepts/ConceptAddOptions.vue'
import ConceptHierarchyRow from '@/components/concepts/detail/ConceptHierarchyRow.vue'
import ConceptHierarchySelectCell from '@/components/concepts/detail/ConceptHierarchySelectCell.vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptDetailStore } from '@/stores/concept-detail'
import { useConceptHierarchyStore } from '@/stores/concept-hierarchy'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { Concept, ConceptAddFlags, ConceptSetItem } from '@/models/concept-set.types'
import type { RelatedConcept } from '@/models/concept-detail.types'

const props = defineProps<{
  modelValue: boolean
  concept: Concept
  sourceKey: string
}>()

const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const { t } = useI18n()
const detail = useConceptDetailStore()
const tree = useConceptHierarchyStore()
const conceptSets = useConceptSetsStore()
const { hierarchy } = storeToRefs(detail)

const isNonStandard = computed(() => props.concept.standardConcept === 'N')

const ancestors = computed(() =>
  hierarchy.value.filter(c =>
    c.relationships.some(
      r => r.relationshipName === 'Has ancestor of' && r.relationshipDistance === 1
    )
  )
)

const descendants = computed(() =>
  hierarchy.value.filter(c =>
    c.relationships.some(
      r => r.relationshipName === 'Has descendant of' && r.relationshipDistance === 1
    )
  )
)

const allDescendantCount = computed(
  () =>
    hierarchy.value.filter(c =>
      c.relationships.some(r => r.relationshipName === 'Has descendant of')
    ).length
)

const allAncestorCount = computed(
  () =>
    hierarchy.value.filter(c =>
      c.relationships.some(r => r.relationshipName === 'Has ancestor of')
    ).length
)

const isEmpty = computed(() => hierarchy.value.length === 0)

const filterText = ref('')
const classFilter = ref<string | null>(null)
const domainFilter = ref<string | null>(null)
const vocabularyFilter = ref<string | null>(null)
const view = ref<'tree' | 'flat'>('tree')

const allDescendants = computed(() =>
  hierarchy.value.filter(c => c.relationships.some(r => r.relationshipName === 'Has descendant of'))
)

function optionsFor(key: 'conceptClassId' | 'domainId' | 'vocabularyId') {
  return [...new Set(hierarchy.value.map(c => c[key]))].sort()
}

function matches(row: RelatedConcept): boolean {
  const q = filterText.value.trim().toLowerCase()
  if (q && !row.conceptName.toLowerCase().includes(q) && !row.conceptCode.toLowerCase().includes(q))
    return false
  if (classFilter.value && row.conceptClassId !== classFilter.value) return false
  if (domainFilter.value && row.domainId !== domainFilter.value) return false
  if (vocabularyFilter.value && row.vocabularyId !== vocabularyFilter.value) return false
  return true
}

const visibleRows = computed(() =>
  (view.value === 'flat' ? allDescendants.value : descendants.value).filter(matches)
)

interface TreeRow {
  row: RelatedConcept
  depth: number
  key: string
}

// One flattened list drives a single <tr v-for>, so rows at every depth share
// one markup block instead of a copy per nesting level. SNOMED is a
// polyhierarchy, so the same conceptId can legitimately appear more than
// once (under two different expanded parents) — the row key is derived from
// the full ancestor path rather than the conceptId alone, so those rows stay
// distinct instead of colliding on a duplicate Vue key.
function flatten(rows: RelatedConcept[], depth: number, path: number[]): TreeRow[] {
  return rows.flatMap(row => {
    const key = [...path, row.conceptId].join('>')
    const self: TreeRow = { row, depth, key }
    // A concept that already appears higher up its own path is a cycle in
    // the source data (should be acyclic, but a bad vocabulary load must
    // not hang the UI) — render it once and stop recursing there.
    if (!tree.isExpanded(row.conceptId) || path.includes(row.conceptId)) return [self]
    return [
      self,
      ...flatten(tree.childrenOf(row.conceptId).filter(matches), depth + 1, [...path, row.conceptId]),
    ]
  })
}

// Flat view already lists every descendant once, at every depth, so
// re-nesting through flatten() would duplicate rows; each concept appears
// only once in the source hierarchy, so its conceptId alone is a safe key.
const treeRows = computed<TreeRow[]>(() =>
  view.value === 'flat'
    ? visibleRows.value.map(row => ({ row, depth: 0, key: String(row.conceptId) }))
    : flatten(visibleRows.value, 0, [])
)

const selected = ref<number[]>([])
const addFlags = ref<Required<ConceptAddFlags>>({
  isExcluded: false,
  includeDescendants: false,
  includeMapped: false,
})
const feedback = ref({ open: false, text: '' })

const canAdd = computed(() => !!conceptSets.currentSet)

const itemsById = computed(() => {
  const map = new Map<number, ConceptSetItem>()
  for (const item of conceptSets.currentSet?.items ?? []) map.set(item.conceptId, item)
  return map
})

function toRow(row: RelatedConcept): Concept {
  return {
    conceptId: row.conceptId,
    conceptName: row.conceptName,
    conceptCode: row.conceptCode,
    domainId: row.domainId,
    vocabularyId: row.vocabularyId,
    conceptClassId: row.conceptClassId,
    standardConcept: row.standardConcept,
    invalidReason: row.invalidReason,
  }
}

function toggleSelected(conceptId: number) {
  selected.value = selected.value.includes(conceptId)
    ? selected.value.filter(id => id !== conceptId)
    : [...selected.value, conceptId]
}

// treeRows already carries every row the user can see and therefore select,
// at every depth — no need to re-walk the expansion cache.
function rowsById(): Map<number, RelatedConcept> {
  const map = new Map<number, RelatedConcept>()
  for (const row of hierarchy.value) map.set(row.conceptId, row)
  for (const { row } of treeRows.value) map.set(row.conceptId, row)
  return map
}

// addConceptToSet silently refuses duplicates, so count what actually landed
// rather than what was ticked.
function onAdd() {
  if (!conceptSets.currentSet) return
  const lookup = rowsById()
  const before = conceptSets.currentSet.items.length
  const attempted = selected.value.length

  for (const conceptId of selected.value) {
    const row = lookup.get(conceptId)
    if (row) conceptSets.addConceptToSet(toRow(row), addFlags.value)
  }

  const added = conceptSets.currentSet.items.length - before
  const skipped = attempted - added
  selected.value = []

  feedback.value = {
    open: true,
    text:
      skipped > 0
        ? t('components.conceptHierarchyDialog.addedSkipped', 'Added {count} concepts, skipped {skipped} already in the set', { count: added, skipped }).value
        : t('components.conceptHierarchyDialog.added', 'Added {count} concepts', { count: added }).value,
  }
}

watch(
  () => props.sourceKey,
  key => tree.setSource(key),
  { immediate: true }
)

watch(
  () => props.modelValue,
  open => {
    if (!open) tree.reset()
  }
)

function toggle(row: RelatedConcept) {
  if (tree.isExpanded(row.conceptId)) {
    tree.collapseNode(row.conceptId)
    return
  }
  void tree.expandNode(row.conceptId)
}

function close() {
  emit('update:modelValue', false)
}

function counts(conceptId: number) {
  return tree.countsFor(conceptId)
}
</script>

<template>
  <AtlasDialog
    :model-value="modelValue"
    :title="t('components.conceptHierarchyDialog.title', 'Hierarchy · {concept}', { concept: concept.conceptName }).value"
    :subtitle="`${concept.conceptId} · ${concept.vocabularyId} · ${concept.conceptCode} · ${concept.domainId}`"
    max-width="1100"
    data-testid="concept-hierarchy-dialog"
    @update:model-value="close"
  >
    <p
      v-if="isNonStandard"
      data-testid="hierarchy-non-standard"
    >
      {{ t('cs.manager.concept.tabs.hierarchy.noHierarchyFoundMessage', 'No hierarchy found for non-standard concepts.').value }}
    </p>

    <p
      v-else-if="isEmpty"
      data-testid="hierarchy-empty"
    >
      {{ t('components.conceptDetail.noHierarchyForConcept', 'No hierarchy found for this concept.').value }}
    </p>

    <template v-else>
      <p class="counts">
        {{ t('components.conceptHierarchyDialog.counts', '{ancestors} ancestors · {descendants} descendants', { ancestors: allAncestorCount, descendants: allDescendantCount }).value }}
      </p>

      <div class="toolbar">
        <AtlasTextField
          v-model="filterText"
          :placeholder="t('components.conceptHierarchyDialog.filterPlaceholder', 'Filter by name or code…').value"
          data-testid="hierarchy-filter"
        />
        <AtlasSelect
          v-model="classFilter"
          clearable
          :items="optionsFor('conceptClassId')"
          :label="t('components.conceptHierarchyDialog.anyClass', 'Class: any').value"
          data-testid="hierarchy-filter-class"
        />
        <AtlasSelect
          v-model="domainFilter"
          clearable
          :items="optionsFor('domainId')"
          :label="t('components.conceptHierarchyDialog.anyDomain', 'Domain: any').value"
          data-testid="hierarchy-filter-domain"
        />
        <AtlasSelect
          v-model="vocabularyFilter"
          clearable
          :items="optionsFor('vocabularyId')"
          :label="t('components.conceptHierarchyDialog.anyVocabulary', 'Vocabulary: any').value"
          data-testid="hierarchy-filter-vocabulary"
        />
        <div class="view-toggle">
          <button
            type="button"
            :class="{ on: view === 'tree' }"
            data-testid="hierarchy-view-tree"
            @click="view = 'tree'"
          >
            {{ t('components.conceptHierarchyDialog.treeView', 'Tree').value }}
          </button>
          <button
            type="button"
            :class="{ on: view === 'flat' }"
            data-testid="hierarchy-view-flat"
            @click="view = 'flat'"
          >
            {{ t('components.conceptHierarchyDialog.flatView', 'Flat').value }}
          </button>
        </div>
      </div>

      <table class="hierarchy-table">
        <thead>
          <tr>
            <th />
            <th>{{ t('columns.conceptName', 'Concept Name').value }}</th>
            <th>{{ t('columns.code', 'Code').value }}</th>
            <th>{{ t('columns.class', 'Class').value }}</th>
            <th>{{ t('columns.domain', 'Domain').value }}</th>
            <th>{{ t('columns.vocabulary', 'Vocabulary').value }}</th>
            <th class="num">
              {{ t('columns.rc', 'RC').value }}
            </th>
            <th class="num">
              {{ t('columns.drc', 'DRC').value }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr class="section-row">
            <td colspan="8">
              {{ t('components.conceptHierarchyDialog.ancestors', 'Ancestors').value }}
            </td>
          </tr>
          <tr
            v-for="a in ancestors"
            :key="`a-${a.conceptId}`"
            :data-testid="`hierarchy-row-${a.conceptId}`"
            class="ancestor"
          >
            <ConceptHierarchySelectCell
              :concept-id="a.conceptId"
              :can-add="canAdd"
              :selected="selected.includes(a.conceptId)"
              @toggle="toggleSelected(a.conceptId)"
            />
            <td>{{ a.conceptName }}</td>
            <td>{{ a.conceptCode }}</td>
            <td>{{ a.conceptClassId }}</td>
            <td>{{ a.domainId }}</td>
            <td>{{ a.vocabularyId }}</td>
            <td class="num">
              {{ counts(a.conceptId)?.recordCount ?? '—' }}
            </td>
            <td class="num">
              {{ counts(a.conceptId)?.descendantRecordCount ?? '—' }}
            </td>
          </tr>

          <tr
            class="anchor"
            data-testid="hierarchy-anchor"
          >
            <td />
            <td>{{ concept.conceptName }}</td>
            <td>{{ concept.conceptCode }}</td>
            <td>{{ concept.conceptClassId }}</td>
            <td>{{ concept.domainId }}</td>
            <td>{{ concept.vocabularyId }}</td>
            <td class="num">
              —
            </td>
            <td class="num">
              —
            </td>
          </tr>

          <template
            v-for="{ row, depth, key } in treeRows"
            :key="key"
          >
            <ConceptHierarchyRow
              :row="row"
              :depth="depth"
              :can-add="canAdd"
              :selected="selected.includes(row.conceptId)"
              :expandable="view === 'tree' && !tree.isLeaf(row.conceptId)"
              :expanded="tree.isExpanded(row.conceptId)"
              :in-set="itemsById.has(row.conceptId)"
              :is-excluded="!!itemsById.get(row.conceptId)?.isExcluded"
              :include-descendants="!!itemsById.get(row.conceptId)?.includeDescendants"
              :record-count="counts(row.conceptId)?.recordCount"
              :descendant-record-count="counts(row.conceptId)?.descendantRecordCount"
              @toggle-select="toggleSelected(row.conceptId)"
              @toggle-expand="toggle(row)"
            />

            <tr
              v-if="tree.isLoading(row.conceptId)"
              :data-testid="`hierarchy-loading-${row.conceptId}`"
            >
              <td colspan="8">
                <AtlasProgressCircular
                  indeterminate
                  size="14"
                />
              </td>
            </tr>

            <tr v-if="tree.hasFailed(row.conceptId)">
              <td colspan="8">
                {{ t('components.conceptHierarchyDialog.expandFailed', 'Could not load children').value }}
                <button
                  type="button"
                  :data-testid="`hierarchy-retry-${row.conceptId}`"
                  @click="tree.expandNode(row.conceptId)"
                >
                  {{ t('components.conceptHierarchyDialog.retry', 'Retry').value }}
                </button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div
        v-if="canAdd"
        class="dialog-footer"
      >
        <ConceptAddOptions
          v-model="addFlags"
          :selected-count="selected.length"
          @add="onAdd"
        />
      </div>
    </template>

    <AtlasSnackbar
      v-model="feedback.open"
      severity="success"
      :text="feedback.text"
    />
  </AtlasDialog>
</template>

<style scoped>
.counts { font-size: 12px; opacity: 0.7; margin: 0 0 8px; }
.hierarchy-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.hierarchy-table th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.65;
  border-bottom: 1px solid rgba(0, 0, 0, 0.15);
  padding: 6px 8px;
}
.hierarchy-table :deep(td) { border-bottom: 1px solid rgba(0, 0, 0, 0.06); padding: 5px 8px; }
.hierarchy-table :deep(td.num) { text-align: right; font-variant-numeric: tabular-nums; }
.section-row td { font-size: 11px; text-transform: uppercase; opacity: 0.6; }
.ancestor { opacity: 0.8; }
.anchor { background: rgba(25, 118, 210, 0.12); font-weight: 600; }
.toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
.view-toggle button { border: 1px solid rgba(0, 0, 0, 0.25); background: none; padding: 2px 10px; font-size: 12px; }
.view-toggle button.on { background: rgba(25, 118, 210, 0.18); font-weight: 600; }
.dialog-footer { border-top: 1px solid rgba(0, 0, 0, 0.12); padding-top: 10px; margin-top: 10px; }
</style>
