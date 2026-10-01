<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  AtlasDialog,
  AtlasTab,
  AtlasTabs,
  AtlasProgressCircular,
  AtlasTextField,
  AtlasSelect,
  AtlasSnackbar,
} from '@/components/ui'
import ConceptAddOptions from '@/components/concepts/ConceptAddOptions.vue'
import ConceptHierarchyRow from '@/components/concepts/detail/ConceptHierarchyRow.vue'
import ConceptHierarchySelectCell from '@/components/concepts/detail/ConceptHierarchySelectCell.vue'
import { useI18n } from '@/composables/useI18n'
import { formatRecordCount } from '@/components/concepts/detail/record-count-format'
import { useConceptDetailStore } from '@/stores/concept-detail'
import { useConceptHierarchyStore } from '@/stores/concept-hierarchy'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { getConceptAncestorAndDescendant } from '@/services/concept-detail.service'
import type { Concept, ConceptAddFlags, ConceptSetItem } from '@/models/concept-set.types'
import type { RelatedConcept } from '@/models/concept-detail.types'
import { matchesTerms } from '@/utils/list-filters'

const props = defineProps<{
  modelValue: boolean
  concept: Concept
  sourceKey: string
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  navigate: [conceptId: number]
}>()

const { t } = useI18n()
const detail = useConceptDetailStore()
const tree = useConceptHierarchyStore()
const conceptSets = useConceptSetsStore()
const { hierarchy, hierarchyError } = storeToRefs(detail)

// The drawer owns the complete concept-details load. The dialog only needs
// hierarchy data, so it keeps an independent focused payload and is free to
// render as soon as that one endpoint answers.
const focusedConcept = ref<Concept>(props.concept)
const focusedHierarchy = ref<RelatedConcept[]>(hierarchy.value)
const isHierarchyLoading = ref(false)
const focusedHierarchyError = ref<string | null>(hierarchyError.value)
let hierarchyRequestGeneration = 0

const isNonStandard = computed(() => focusedConcept.value.standardConcept === 'N')

interface AncestorRow {
  concept: RelatedConcept
  distance: number
}

// Every ancestor at every distance, not just the direct parents: the header
// advertises the full count, so a truncated list would repeat the very bug
// this dialog exists to fix.
const ancestors = computed<AncestorRow[]>(() =>
  focusedHierarchy.value
    .flatMap(concept => {
      const distances = concept.relationships
        .filter(r => r.relationshipName === 'Has ancestor of')
        .map(r => r.relationshipDistance)
      return distances.length > 0 ? [{ concept, distance: Math.min(...distances) }] : []
    })
    // Ancestors render above the anchor, so the chain has to read downwards:
    // most distant first, direct parents last and adjacent to the anchor row.
    .sort((a, b) => b.distance - a.distance)
)

interface DescendantRow {
  concept: RelatedConcept
  distance: number
}

interface TreeRow {
  row: RelatedConcept
  depth: number
  key: string
  path: number[]
}

const descendants = computed<DescendantRow[]>(() =>
  focusedHierarchy.value.flatMap(concept => {
    const distances = concept.relationships
      .filter(r => r.relationshipName === 'Has descendant of')
      .map(r => r.relationshipDistance)
    return distances.length > 0 ? [{ concept, distance: Math.min(...distances) }] : []
  }).sort((a, b) => a.distance - b.distance)
)

const allAncestorCount = computed(() => ancestors.value.length)

// Collapsed by default to the direct parents, per the design spec — ancestors
// aren't the point of this dialog. The toolbar count above always reports the
// full total regardless of this flag, so "N ancestors" never disagrees with
// what a prior review already flagged: it's the collapsed control below that
// has to name the remainder, not the header.
const ancestorsExpanded = ref(false)
const directAncestors = computed(() => ancestors.value.filter(a => a.distance === 1))
const hiddenAncestorCount = computed(() => ancestors.value.length - directAncestors.value.length)
const visibleAncestors = computed(() => (ancestorsExpanded.value ? ancestors.value : directAncestors.value))

const descendantsExpanded = ref(false)
const view = ref<'tabular' | 'tree'>('tabular')
const directDescendants = computed(() => descendants.value.filter(d => d.distance === 1))
const hiddenDescendantCount = computed(() => descendants.value.length - directDescendants.value.length)
const visibleDescendants = computed(() =>
  descendantsExpanded.value ? descendants.value : directDescendants.value
)

const treeRoots = computed(() => directDescendants.value.map(({ concept }) => concept))

function flattenTree(rows: RelatedConcept[], depth: number, path: number[]): TreeRow[] {
  return rows.flatMap(row => {
    const nextPath = [...path, row.conceptId]
    const treeRow: TreeRow = { row, depth, key: nextPath.join('>'), path: nextPath }
    if (!tree.isExpanded(row.conceptId) || path.includes(row.conceptId)) return [treeRow]
    return [treeRow, ...flattenTree(tree.childrenOf(row.conceptId), depth + 1, nextPath)]
  })
}

const treeRows = computed(() => flattenTree(treeRoots.value, 0, [focusedConcept.value.conceptId]))

const isEmpty = computed(() => focusedHierarchy.value.length === 0)

const filterText = ref('')
const classFilter = ref<string | null>(null)
const domainFilter = ref<string | null>(null)
const vocabularyFilter = ref<string | null>(null)
type CountSortKey = 'recordCount' | 'descendantRecordCount'
type SortDirection = 'asc' | 'desc'
const countSort = ref<{ key: CountSortKey; direction: SortDirection } | null>(null)
const allDescendantCount = computed(() => descendants.value.length)

function optionsFor(key: 'conceptClassId' | 'domainId' | 'vocabularyId') {
  return [...new Set(focusedHierarchy.value.map(c => c[key]))].sort()
}

function matches(row: RelatedConcept): boolean {
  const q = filterText.value
  if (!matchesTerms([row.conceptName, row.conceptCode], q))
    return false
  if (classFilter.value && row.conceptClassId !== classFilter.value) return false
  if (domainFilter.value && row.domainId !== domainFilter.value) return false
  if (vocabularyFilter.value && row.vocabularyId !== vocabularyFilter.value) return false
  return true
}

const filteredVisibleAncestors = computed(() =>
  visibleAncestors.value.filter(({ concept }) => matches(concept))
)

const visibleDescendantRows = computed(() =>
  visibleDescendants.value.filter(({ concept }) => matches(concept))
)

function sortedRows<T extends AncestorRow | DescendantRow>(rows: T[]): T[] {
  const sort = countSort.value
  if (!sort) return rows

  return [...rows].sort((left, right) => {
    const leftCount = counts(left.concept.conceptId)?.[sort.key]
    const rightCount = counts(right.concept.conceptId)?.[sort.key]
    if (leftCount === undefined) return rightCount === undefined ? 0 : 1
    if (rightCount === undefined) return -1
    if (leftCount === rightCount) return left.concept.conceptId - right.concept.conceptId
    return sort.direction === 'asc' ? leftCount - rightCount : rightCount - leftCount
  })
}

const sortedVisibleAncestors = computed(() => sortedRows(filteredVisibleAncestors.value))
const sortedVisibleDescendantRows = computed(() => sortedRows(visibleDescendantRows.value))

function toggleCountSort(key: CountSortKey) {
  if (countSort.value?.key !== key) {
    countSort.value = { key, direction: 'asc' }
  } else {
    countSort.value = {
      key,
      direction: countSort.value.direction === 'asc' ? 'desc' : 'asc',
    }
  }
}

function sortIndicator(key: CountSortKey): string {
  if (countSort.value?.key !== key) return ''
  return countSort.value.direction === 'asc' ? ' ▲' : ' ▼'
}

function ariaSort(key: CountSortKey): 'none' | 'ascending' | 'descending' {
  if (countSort.value?.key !== key) return 'none'
  return countSort.value.direction === 'asc' ? 'ascending' : 'descending'
}

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

// Ticks survive a filter change or a collapse, so the action must be scoped to
// what is on screen right now — otherwise Add quietly adds rows the user can no
// longer see, and the footer count disagrees with what happens. This applies
// to the ancestor collapse too: a distance-2+ ancestor ticked while expanded
// and then hidden by re-collapsing drops out of both the footer count and Add,
// exactly like a row hidden by the filter or a closed tree node.
const visibleById = computed(() => {
  const map = new Map<number, RelatedConcept>()
  if (view.value === 'tree') {
    for (const treeRow of treeRows.value) map.set(treeRow.row.conceptId, treeRow.row)
    return map
  }
  for (const { concept } of filteredVisibleAncestors.value) map.set(concept.conceptId, concept)
  for (const { concept } of visibleDescendantRows.value) map.set(concept.conceptId, concept)
  return map
})

const selectedVisible = computed(() => selected.value.filter(id => visibleById.value.has(id)))

// addConceptToSet refuses a row that repeats a concept AND its flags, so count
// what actually landed rather than what was ticked.
function onAdd() {
  if (!conceptSets.currentSet) return
  const lookup = visibleById.value
  const before = conceptSets.currentSet.items.length
  const attempted = selectedVisible.value.length

  for (const conceptId of selectedVisible.value) {
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
    if (!open) {
      tree.reset()
      selected.value = []
    }
  }
)

function resetForFocusedConcept() {
  tree.reset()
  selected.value = []
  ancestorsExpanded.value = false
  descendantsExpanded.value = false
  filterText.value = ''
  classFilter.value = null
  domainFilter.value = null
  vocabularyFilter.value = null
}

// External navigation still arrives through the root drawer. Adopt its payload
// only when it points somewhere other than the dialog's current local focus;
// a dialog-initiated click fetches its own hierarchy and must not be replaced
// by the root loader's in-flight shared state.
watch(
  () => props.concept.conceptId,
  () => {
    if (props.concept.conceptId === focusedConcept.value.conceptId) return
    hierarchyRequestGeneration++
    focusedConcept.value = props.concept
    focusedHierarchy.value = hierarchy.value
    focusedHierarchyError.value = hierarchyError.value
    isHierarchyLoading.value = false
    resetForFocusedConcept()
  }
)

// The rows on screen when the dialog opens come from the concept-detail store,
// not from an expansion, so nothing else would ever fetch their counts.
watch(
  [() => props.modelValue, () => focusedConcept.value.conceptId, () => props.sourceKey, focusedHierarchy],
  ([open]) => {
    if (!open) return
    void tree.loadCounts(
      [
        focusedConcept.value.conceptId,
        ...ancestors.value.map(a => a.concept.conceptId),
        ...directDescendants.value.map(d => d.concept.conceptId),
      ],
      props.sourceKey
    )
  },
  { immediate: true }
)

// The drawer renders its content behind v-if, so closing it unmounts the dialog
// without ever flipping modelValue — reset here too or expansion state leaks
// into the next session.
onUnmounted(() => tree.reset())

function close() {
  emit('update:modelValue', false)
}

async function loadFocusedHierarchy(concept: Concept) {
  const requestGeneration = ++hierarchyRequestGeneration
  isHierarchyLoading.value = true
  focusedHierarchyError.value = null
  try {
    const payload = await getConceptAncestorAndDescendant(props.sourceKey, concept.conceptId)
    if (requestGeneration !== hierarchyRequestGeneration) return
    focusedHierarchy.value = payload
    void tree.loadCounts(
      [
        concept.conceptId,
        ...payload
          .filter(row => row.relationships.some(r => r.relationshipName === 'Has ancestor of'))
          .map(row => row.conceptId),
        ...payload
          .filter(row => row.relationships.some(
            r => r.relationshipName === 'Has descendant of' && r.relationshipDistance === 1
          ))
          .map(row => row.conceptId),
      ],
      props.sourceKey
    )
  } catch {
    if (requestGeneration === hierarchyRequestGeneration) {
      focusedHierarchy.value = []
      focusedHierarchyError.value = 'Failed to load hierarchy'
    }
  } finally {
    if (requestGeneration === hierarchyRequestGeneration) isHierarchyLoading.value = false
  }
}

function navigate(conceptId: number) {
  if (conceptId === focusedConcept.value.conceptId) return
  const target = focusedHierarchy.value.find(concept => concept.conceptId === conceptId)
  if (target) {
    focusedConcept.value = toRow(target)
    resetForFocusedConcept()
    void loadFocusedHierarchy(focusedConcept.value)
  }
  emit('navigate', conceptId)
}

function toggleTreeNode(conceptId: number) {
  if (tree.isExpanded(conceptId)) {
    tree.collapseNode(conceptId)
  } else {
    void tree.expandNode(conceptId)
  }
}

function counts(conceptId: number) {
  return tree.countsFor(conceptId)
}

const anchorCounts = computed(() =>
  counts(focusedConcept.value.conceptId) ??
  (focusedConcept.value.conceptId === props.concept.conceptId
    ? detail.recordCountsBySource.get(props.sourceKey)
    : undefined)
)
</script>

<template>
  <AtlasDialog
    :model-value="modelValue"
    :title="t('components.conceptHierarchyDialog.title', 'Hierarchy · {concept}', { concept: focusedConcept.conceptName }).value"
    :subtitle="`${focusedConcept.conceptId} · ${focusedConcept.vocabularyId} · ${focusedConcept.conceptCode} · ${focusedConcept.domainId}`"
    max-width="1100"
    data-testid="concept-hierarchy-dialog"
    @update:model-value="close"
  >
    <div
      v-if="isHierarchyLoading"
      class="hierarchy-loading-state"
      data-testid="hierarchy-loading"
      aria-live="polite"
    >
      <AtlasProgressCircular
        indeterminate
        size="32"
      />
      <p>{{ t('components.conceptHierarchyDialog.loading', 'Loading hierarchy…').value }}</p>
    </div>

    <p
      v-else-if="isNonStandard"
      data-testid="hierarchy-non-standard"
    >
      {{ t('cs.manager.concept.tabs.hierarchy.noHierarchyFoundMessage', 'No hierarchy found for non-standard concepts.').value }}
    </p>

    <p
      v-else-if="focusedHierarchyError"
      data-testid="hierarchy-load-failed"
    >
      {{ t('components.conceptDetail.hierarchyLoadFailed', 'Could not load the hierarchy for this concept.').value }}
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

      <AtlasTabs
        v-model="view"
        class="hierarchy-view-tabs"
        data-testid="hierarchy-view-tabs"
      >
        <AtlasTab
          value="tabular"
          data-testid="hierarchy-view-tabular"
        >
          {{ t('components.conceptHierarchyDialog.tabularView', 'Tabular').value }}
        </AtlasTab>
        <AtlasTab
          value="tree"
          data-testid="hierarchy-view-tree"
        >
          {{ t('components.conceptHierarchyDialog.treeView', 'Tree').value }}
        </AtlasTab>
      </AtlasTabs>

      <div
        v-if="view === 'tabular'"
        class="toolbar"
      >
        <AtlasTextField
          v-model="filterText"
          :placeholder="t('components.conceptHierarchyDialog.filterPlaceholder', 'Filter by name or code…').value"
          data-testid="hierarchy-filter"
        />
        <AtlasSelect
          v-model="classFilter"
          clearable
          :items="optionsFor('conceptClassId')"
          :placeholder="t('columns.class', 'Class').value"
          :aria-label="t('components.conceptHierarchyDialog.filterByClass', 'Filter by class').value"
          data-testid="hierarchy-filter-class"
        />
        <AtlasSelect
          v-model="domainFilter"
          clearable
          :items="optionsFor('domainId')"
          :placeholder="t('columns.domain', 'Domain').value"
          :aria-label="t('components.conceptHierarchyDialog.filterByDomain', 'Filter by domain').value"
          data-testid="hierarchy-filter-domain"
        />
        <AtlasSelect
          v-model="vocabularyFilter"
          clearable
          :items="optionsFor('vocabularyId')"
          :placeholder="t('columns.vocabulary', 'Vocabulary').value"
          :aria-label="t('components.conceptHierarchyDialog.filterByVocabulary', 'Filter by vocabulary').value"
          data-testid="hierarchy-filter-vocabulary"
        />
      </div>

      <table
        v-if="view === 'tabular'"
        class="hierarchy-table"
      >
        <thead>
          <tr>
            <th />
            <th>{{ t('columns.conceptName', 'Concept Name').value }}</th>
            <th>{{ t('columns.code', 'Code').value }}</th>
            <th>{{ t('columns.class', 'Class').value }}</th>
            <th>{{ t('columns.domain', 'Domain').value }}</th>
            <th>{{ t('columns.vocabulary', 'Vocabulary').value }}</th>
            <th
              class="num"
              :aria-sort="ariaSort('recordCount')"
            >
              <button
                type="button"
                class="count-sort"
                data-testid="hierarchy-sort-rc"
                :aria-label="t('components.conceptHierarchyDialog.sortRecordCount', 'Sort by record count').value"
                @click="toggleCountSort('recordCount')"
              >
                {{ t('columns.rc', 'RC').value }}{{ sortIndicator('recordCount') }}
              </button>
            </th>
            <th
              class="num"
              :aria-sort="ariaSort('descendantRecordCount')"
            >
              <button
                type="button"
                class="count-sort"
                data-testid="hierarchy-sort-drc"
                :aria-label="t('components.conceptHierarchyDialog.sortDescendantRecordCount', 'Sort by descendant record count').value"
                @click="toggleCountSort('descendantRecordCount')"
              >
                {{ t('columns.drc', 'DRC').value }}{{ sortIndicator('descendantRecordCount') }}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            class="section-row"
            data-testid="hierarchy-ancestors-section"
          >
            <td colspan="8">
              {{ t('components.conceptHierarchyDialog.ancestors', 'Ancestors').value }}
              <button
                v-if="hiddenAncestorCount > 0"
                type="button"
                class="ancestors-toggle"
                :aria-expanded="ancestorsExpanded"
                data-testid="hierarchy-ancestors-toggle"
                @click="ancestorsExpanded = !ancestorsExpanded"
              >
                {{ ancestorsExpanded
                  ? t('components.conceptHierarchyDialog.collapseAncestors', 'Show direct parents only').value
                  : t('components.conceptHierarchyDialog.showMoreAncestors', 'Show {count} more ancestors', { count: hiddenAncestorCount }).value }}
              </button>
            </td>
          </tr>
          <tr
            v-for="{ concept: a, distance } in sortedVisibleAncestors"
            :key="`a-${a.conceptId}`"
            :data-testid="`hierarchy-row-${a.conceptId}`"
            data-ancestor-row
            class="ancestor"
          >
            <ConceptHierarchySelectCell
              :concept-id="a.conceptId"
              :concept-name="a.conceptName"
              :can-add="canAdd"
              :selected="selected.includes(a.conceptId)"
              @toggle="toggleSelected(a.conceptId)"
            />
            <td>
              <button
                type="button"
                class="concept-link"
                :data-testid="`hierarchy-navigate-${a.conceptId}`"
                @click="navigate(a.conceptId)"
              >
                {{ a.conceptName }}
              </button>
              <span
                v-if="ancestorsExpanded"
                class="dist"
              >{{ t('components.conceptHierarchyDialog.ancestorDistance', 'distance {distance}', { distance }).value }}</span>
            </td>
            <td>{{ a.conceptCode }}</td>
            <td>{{ a.conceptClassId }}</td>
            <td>{{ a.domainId }}</td>
            <td>{{ a.vocabularyId }}</td>
            <td class="num">
              {{ formatRecordCount(counts(a.conceptId)?.recordCount) }}
            </td>
            <td class="num">
              {{ formatRecordCount(counts(a.conceptId)?.descendantRecordCount) }}
            </td>
          </tr>

          <tr
            class="section-row"
            data-testid="hierarchy-current-section"
          >
            <td colspan="8">
              {{ t('components.conceptHierarchyDialog.currentConcept', 'Current concept').value }}
            </td>
          </tr>
          <tr
            class="anchor"
            data-testid="hierarchy-anchor"
          >
            <td />
            <td>{{ focusedConcept.conceptName }}</td>
            <td>{{ focusedConcept.conceptCode }}</td>
            <td>{{ focusedConcept.conceptClassId }}</td>
            <td>{{ focusedConcept.domainId }}</td>
            <td>{{ focusedConcept.vocabularyId }}</td>
            <td class="num">
              {{ formatRecordCount(anchorCounts?.recordCount) }}
            </td>
            <td class="num">
              {{ formatRecordCount(anchorCounts?.descendantRecordCount) }}
            </td>
          </tr>

          <tr
            class="section-row"
            data-testid="hierarchy-descendants-section"
          >
            <td colspan="8">
              {{ t('components.conceptHierarchyDialog.descendants', 'Descendants').value }}
              <button
                v-if="hiddenDescendantCount > 0"
                type="button"
                class="ancestors-toggle"
                :aria-expanded="descendantsExpanded"
                data-testid="hierarchy-descendants-toggle"
                @click="descendantsExpanded = !descendantsExpanded"
              >
                {{ descendantsExpanded
                  ? t('components.conceptHierarchyDialog.collapseDescendants', 'Show direct children only').value
                  : t('components.conceptHierarchyDialog.showMoreDescendants', 'Show {count} more children', { count: hiddenDescendantCount }).value }}
              </button>
            </td>
          </tr>
          <template
            v-for="{ concept: row, distance } in sortedVisibleDescendantRows"
            :key="row.conceptId"
          >
            <ConceptHierarchyRow
              :row="row"
              :depth="0"
              :can-add="canAdd"
              :selected="selected.includes(row.conceptId)"
              :distance="distance"
              :show-distance="descendantsExpanded"
              :in-set="itemsById.has(row.conceptId)"
              :is-excluded="!!itemsById.get(row.conceptId)?.isExcluded"
              :include-descendants="!!itemsById.get(row.conceptId)?.includeDescendants"
              :record-count="counts(row.conceptId)?.recordCount"
              :descendant-record-count="counts(row.conceptId)?.descendantRecordCount"
              @toggle-select="toggleSelected(row.conceptId)"
              @navigate="navigate"
            />
          </template>
        </tbody>
      </table>

      <table
        v-else
        class="hierarchy-table hierarchy-tree-table"
        data-testid="hierarchy-tree"
      >
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
          <tr
            class="section-row"
            data-testid="hierarchy-tree-ancestors-section"
          >
            <td colspan="8">
              {{ t('components.conceptHierarchyDialog.ancestors', 'Ancestors').value }}
            </td>
          </tr>
          <tr
            v-for="{ concept: ancestor } in directAncestors"
            :key="`tree-ancestor-${ancestor.conceptId}`"
            :data-testid="`hierarchy-tree-ancestor-${ancestor.conceptId}`"
          >
            <td />
            <td>
              <button
                type="button"
                class="concept-link"
                :data-testid="`hierarchy-tree-navigate-${ancestor.conceptId}`"
                @click="navigate(ancestor.conceptId)"
              >
                {{ ancestor.conceptName }}
              </button>
            </td>
            <td>{{ ancestor.conceptCode }}</td>
            <td>{{ ancestor.conceptClassId }}</td>
            <td>{{ ancestor.domainId }}</td>
            <td>{{ ancestor.vocabularyId }}</td>
            <td class="num">
              {{ formatRecordCount(counts(ancestor.conceptId)?.recordCount) }}
            </td>
            <td class="num">
              {{ formatRecordCount(counts(ancestor.conceptId)?.descendantRecordCount) }}
            </td>
          </tr>
          <tr
            class="section-row"
            data-testid="hierarchy-tree-current-section"
          >
            <td colspan="8">
              {{ t('components.conceptHierarchyDialog.currentConcept', 'Current concept').value }}
            </td>
          </tr>
          <tr
            class="anchor"
            data-testid="hierarchy-tree-anchor"
          >
            <td />
            <td>{{ focusedConcept.conceptName }}</td>
            <td>{{ focusedConcept.conceptCode }}</td>
            <td>{{ focusedConcept.conceptClassId }}</td>
            <td>{{ focusedConcept.domainId }}</td>
            <td>{{ focusedConcept.vocabularyId }}</td>
            <td class="num">
              {{ formatRecordCount(anchorCounts?.recordCount) }}
            </td>
            <td class="num">
              {{ formatRecordCount(anchorCounts?.descendantRecordCount) }}
            </td>
          </tr>
          <tr
            class="section-row"
            data-testid="hierarchy-tree-descendants-section"
          >
            <td colspan="8">
              {{ t('components.conceptHierarchyDialog.descendants', 'Descendants').value }}
            </td>
          </tr>
          <ConceptHierarchyRow
            v-for="treeRow in treeRows"
            :key="treeRow.key"
            :row="treeRow.row"
            :depth="treeRow.depth"
            :can-add="canAdd"
            :selected="selected.includes(treeRow.row.conceptId)"
            :show-distance="false"
            :in-set="itemsById.has(treeRow.row.conceptId)"
            :is-excluded="!!itemsById.get(treeRow.row.conceptId)?.isExcluded"
            :include-descendants="!!itemsById.get(treeRow.row.conceptId)?.includeDescendants"
            :record-count="counts(treeRow.row.conceptId)?.recordCount"
            :descendant-record-count="counts(treeRow.row.conceptId)?.descendantRecordCount"
            :expandable="!tree.isLeaf(treeRow.row.conceptId) && !tree.isLoading(treeRow.row.conceptId) && !tree.hasFailed(treeRow.row.conceptId)"
            :expanded="tree.isExpanded(treeRow.row.conceptId)"
            :loading="tree.isLoading(treeRow.row.conceptId)"
            :failed="tree.hasFailed(treeRow.row.conceptId)"
            :leaf="tree.isLeaf(treeRow.row.conceptId)"
            show-expansion-column
            @toggle-select="toggleSelected(treeRow.row.conceptId)"
            @toggle-expand="toggleTreeNode(treeRow.row.conceptId)"
            @navigate="navigate"
          />
        </tbody>
      </table>

      <div
        v-if="canAdd"
        class="dialog-footer"
      >
        <ConceptAddOptions
          v-model="addFlags"
          :selected-count="selectedVisible.length"
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
  border-bottom: 1px solid var(--atlas-color-outline);
  padding: 6px 8px;
}
.hierarchy-table :deep(td) { border-bottom: 1px solid var(--atlas-color-outline-variant); padding: 5px 8px; }
.hierarchy-table :deep(td.num) { text-align: right; font-variant-numeric: tabular-nums; }
.count-sort { background: none; border: 0; color: inherit; cursor: pointer; font: inherit; padding: 0; }
.section-row td { font-size: 11px; text-transform: uppercase; opacity: 0.6; }
.ancestors-toggle {
  background: none;
  border: none;
  color: rgb(25, 118, 210);
  text-transform: none;
  font-size: 11px;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
}
.dist { font-size: 11px; opacity: 0.55; margin-left: 6px; }
.ancestor { opacity: 0.8; }
.anchor { background: var(--atlas-color-primary-tint); font-weight: 600; }
.toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
.hierarchy-loading-state { align-items: center; display: flex; flex-direction: column; justify-content: center; min-height: 420px; }
.hierarchy-loading-state p { font-size: 13px; margin: 12px 0 0; }
.dialog-footer { border-top: 1px solid var(--atlas-color-outline); padding-top: 10px; margin-top: 10px; }

/* Light keeps its own literals here: --atlas-color-primary-text is navy, not
 * the link blue this toggle has always used, and light --atlas-color-outline-
 * strong is only rgba(0,0,0,.12) — half this border's weight. */
.v-theme--dark .ancestors-toggle {
  color: var(--atlas-color-primary-text);
}
.concept-link { background: none; border: none; color: inherit; cursor: pointer; font: inherit; padding: 0; text-align: left; }
.concept-link:hover { text-decoration: underline; }
</style>
