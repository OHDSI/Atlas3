<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
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
import { formatRecordCount } from '@/components/concepts/detail/record-count-format'
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
const { hierarchy, hierarchyError } = storeToRefs(detail)

const isNonStandard = computed(() => props.concept.standardConcept === 'N')

interface AncestorRow {
  concept: RelatedConcept
  distance: number
}

// Every ancestor at every distance, not just the direct parents: the header
// advertises the full count, so a truncated list would repeat the very bug
// this dialog exists to fix.
const ancestors = computed<AncestorRow[]>(() =>
  hierarchy.value
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

const descendants = computed(() =>
  hierarchy.value.filter(c =>
    c.relationships.some(
      r => r.relationshipName === 'Has descendant of' && r.relationshipDistance === 1
    )
  )
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

const isEmpty = computed(() => hierarchy.value.length === 0)

const filterText = ref('')
const classFilter = ref<string | null>(null)
const domainFilter = ref<string | null>(null)
const vocabularyFilter = ref<string | null>(null)
const view = ref<'tree' | 'flat'>('tree')
const switchingView = ref(false)

/**
 * Switching view re-renders every row, which takes seconds on a concept with
 * a large subtree and looked like nothing had happened, so the button got
 * clicked again (#207).
 *
 * The yield matters: flipping `view` in the same tick that sets the flag lets
 * Vue batch both, and the expensive render blocks the frame, so the spinner
 * never reaches the screen. Handing control back to the event loop first lets
 * it paint before the work starts.
 */
async function setView(next: 'tree' | 'flat') {
  // The guard is not redundant with the buttons' disabled state: a click can
  // land in the window between setting the flag and the DOM reflecting it.
  if (next === view.value || switchingView.value) return

  switchingView.value = true
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))

  view.value = next
  await nextTick()
  switchingView.value = false
}

const anchorDescendants = computed(() =>
  hierarchy.value.filter(c => c.relationships.some(r => r.relationshipName === 'Has descendant of'))
)

// Expanding a node in Tree view fetches and caches that node's children
// through the hierarchy store, independently of the anchor's own
// ancestorAndDescendant payload. The two can disagree — different distance
// cut-offs, vocabulary refresh skew, a concept whose own response includes
// something the anchor's didn't — so Flat merges both, deduplicated by
// conceptId with the anchor payload winning any overlap. Concepts found only
// through expansion are appended in discovery order, so switching views never
// reorders anything already visible.
const allDescendants = computed<RelatedConcept[]>(() => {
  const seen = new Set(anchorDescendants.value.map(c => c.conceptId))
  const discovered: RelatedConcept[] = []
  for (const children of tree.childrenByConcept.values()) {
    for (const child of children) {
      if (seen.has(child.conceptId)) continue
      seen.add(child.conceptId)
      discovered.push(child)
    }
  }
  return [...anchorDescendants.value, ...discovered]
})

// The toolbar advertises this same merged total, so it can never disagree
// with what Flat actually renders — a count/rows mismatch was a review
// finding on this branch once already, in the ancestor direction.
const allDescendantCount = computed(() => allDescendants.value.length)

// hierarchy.value is only the anchor's own payload. A concept surfaced by
// expanding a node (allDescendants.value) can carry a facet value the anchor
// payload never mentioned, so the dropdown has to draw from the same rows the
// filter itself matches against — otherwise a value is reachable by free-text
// search but has no facet option to select it with.
function optionsFor(key: 'conceptClassId' | 'domainId' | 'vocabularyId') {
  const values = new Set(hierarchy.value.map(c => c[key]))
  for (const c of allDescendants.value) values.add(c[key])
  return [...values].sort()
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

const flatRows = computed(() => allDescendants.value.filter(matches))

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
//
// Filtering is resolved bottom-up: a row survives when it matches or when
// anything in its loaded subtree does, so a match never appears detached from
// its ancestor chain. Only already-expanded nodes are walked, so filtering
// still never triggers a fetch.
function flatten(rows: RelatedConcept[], depth: number, path: number[]): TreeRow[] {
  return rows.flatMap(row => {
    const self: TreeRow = { row, depth, key: [...path, row.conceptId].join('>') }
    // A concept that already appears higher up its own path is a cycle in
    // the source data (should be acyclic, but a bad vocabulary load must
    // not hang the UI) — render it once and stop recursing there.
    if (!tree.isExpanded(row.conceptId) || path.includes(row.conceptId)) {
      return matches(row) ? [self] : []
    }
    const children = flatten(tree.childrenOf(row.conceptId), depth + 1, [...path, row.conceptId])
    if (children.length === 0 && !matches(row)) return []
    return [self, ...children]
  })
}

// Flat view already lists every descendant once, at every depth, so
// re-nesting through flatten() would duplicate rows; each concept appears
// only once in the source hierarchy, so its conceptId alone is a safe key.
const treeRows = computed<TreeRow[]>(() =>
  view.value === 'flat'
    ? flatRows.value.map(row => ({ row, depth: 0, key: String(row.conceptId) }))
    : flatten(descendants.value, 0, [])
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

// Ticks survive a filter change or a collapse, so the action must be scoped to
// what is on screen right now — otherwise Add quietly adds rows the user can no
// longer see, and the footer count disagrees with what happens. This applies
// to the ancestor collapse too: a distance-2+ ancestor ticked while expanded
// and then hidden by re-collapsing drops out of both the footer count and Add,
// exactly like a row hidden by the filter or a closed tree node.
const visibleById = computed(() => {
  const map = new Map<number, RelatedConcept>()
  for (const { concept } of visibleAncestors.value) map.set(concept.conceptId, concept)
  for (const { row } of treeRows.value) map.set(row.conceptId, row)
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

// One dialog instance is reused as the drawer moves between concepts, so ticks
// made for the previous concept would otherwise stay live — and get added.
// The ancestor collapse is scoped to the same lifetime: an expand toggled for
// concept A must not leak into concept B rendering pre-expanded when the user
// never touched B's toggle.
watch(
  () => props.concept.conceptId,
  () => {
    selected.value = []
    ancestorsExpanded.value = false
  }
)

// The rows on screen when the dialog opens come from the concept-detail store,
// not from an expansion, so nothing else would ever fetch their counts.
watch(
  [() => props.modelValue, () => props.concept.conceptId, () => props.sourceKey, hierarchy],
  ([open]) => {
    if (!open) return
    void tree.loadCounts(
      [
        ...ancestors.value.map(a => a.concept.conceptId),
        ...descendants.value.map(c => c.conceptId),
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

const anchorCounts = computed(() => detail.recordCountsBySource.get(props.sourceKey))
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
      v-else-if="hierarchyError"
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
            :aria-pressed="view === 'tree'"
            :disabled="switchingView"
            data-testid="hierarchy-view-tree"
            @click="setView('tree')"
          >
            {{ t('components.conceptHierarchyDialog.treeView', 'Tree').value }}
          </button>
          <button
            type="button"
            :class="{ on: view === 'flat' }"
            :aria-pressed="view === 'flat'"
            :disabled="switchingView"
            data-testid="hierarchy-view-flat"
            @click="setView('flat')"
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
          <tr
            v-if="switchingView"
            data-testid="hierarchy-view-switching"
          >
            <td colspan="8">
              <AtlasProgressCircular
                indeterminate
                size="16"
              />
              <span class="view-switching__label">
                {{ t('components.conceptHierarchyDialog.switchingView', 'Rebuilding the list…').value }}
              </span>
            </td>
          </tr>

          <tr class="section-row">
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
            v-for="{ concept: a, distance } in visibleAncestors"
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
              {{ a.conceptName }}
              <span class="dist">{{ t('components.conceptHierarchyDialog.ancestorDistance', 'distance {distance}', { distance }).value }}</span>
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
              {{ formatRecordCount(anchorCounts?.recordCount) }}
            </td>
            <td class="num">
              {{ formatRecordCount(anchorCounts?.descendantRecordCount) }}
            </td>
          </tr>

          <template
            v-for="{ row, depth, key } in (switchingView ? [] : treeRows)"
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
.view-switching__label { margin-inline-start: 8px; font-size: 12px; }
.view-toggle button { border: 1px solid rgba(0, 0, 0, 0.25); background: none; padding: 2px 10px; font-size: 12px; }
.view-toggle button.on { background: var(--atlas-color-primary-tint-strong); font-weight: 600; }
.dialog-footer { border-top: 1px solid var(--atlas-color-outline); padding-top: 10px; margin-top: 10px; }

/* Light keeps its own literals here: --atlas-color-primary-text is navy, not
 * the link blue this toggle has always used, and light --atlas-color-outline-
 * strong is only rgba(0,0,0,.12) — half this border's weight. */
.v-theme--dark .ancestors-toggle {
  color: var(--atlas-color-primary-text);
}
.v-theme--dark .view-toggle button {
  border-color: var(--atlas-color-outline-strong);
}
</style>
