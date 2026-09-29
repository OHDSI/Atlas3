<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
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
const { hierarchy, hierarchyError, isLoading } = storeToRefs(detail)

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

interface DescendantRow {
  concept: RelatedConcept
  distance: number
}

const descendants = computed<DescendantRow[]>(() =>
  hierarchy.value.flatMap(concept => {
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
const directDescendants = computed(() => descendants.value.filter(d => d.distance === 1))
const hiddenDescendantCount = computed(() => descendants.value.length - directDescendants.value.length)
const visibleDescendants = computed(() =>
  descendantsExpanded.value ? descendants.value : directDescendants.value
)

const isEmpty = computed(() => hierarchy.value.length === 0)

const filterText = ref('')
const classFilter = ref<string | null>(null)
const domainFilter = ref<string | null>(null)
const vocabularyFilter = ref<string | null>(null)
const pendingConcept = ref<Concept | null>(null)

const displayedConcept = computed(() =>
  isLoading.value && pendingConcept.value ? pendingConcept.value : props.concept
)

const allDescendantCount = computed(() => descendants.value.length)

function optionsFor(key: 'conceptClassId' | 'domainId' | 'vocabularyId') {
  return [...new Set(hierarchy.value.map(c => c[key]))].sort()
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

// One dialog instance is reused as the drawer moves between concepts, so ticks
// made for the previous concept would otherwise stay live — and get added.
// The ancestor collapse is scoped to the same lifetime: an expand toggled for
// concept A must not leak into concept B rendering pre-expanded when the user
// never touched B's toggle.
watch(
  () => props.concept.conceptId,
  () => {
    selected.value = []
    pendingConcept.value = null
    ancestorsExpanded.value = false
    descendantsExpanded.value = false
    filterText.value = ''
    classFilter.value = null
    domainFilter.value = null
    vocabularyFilter.value = null
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

function navigate(conceptId: number) {
  if (conceptId === props.concept.conceptId) return
  const target = hierarchy.value.find(concept => concept.conceptId === conceptId)
  pendingConcept.value = target ? toRow(target) : null
  emit('navigate', conceptId)
}

function counts(conceptId: number) {
  return tree.countsFor(conceptId)
}

const anchorCounts = computed(() => detail.recordCountsBySource.get(props.sourceKey))
</script>

<template>
  <AtlasDialog
    :model-value="modelValue"
    :title="t('components.conceptHierarchyDialog.title', 'Hierarchy · {concept}', { concept: displayedConcept.conceptName }).value"
    :subtitle="`${displayedConcept.conceptId} · ${displayedConcept.vocabularyId} · ${displayedConcept.conceptCode} · ${displayedConcept.domainId}`"
    max-width="1100"
    data-testid="concept-hierarchy-dialog"
    @update:model-value="close"
  >
    <div
      v-if="isLoading"
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
            v-for="{ concept: a, distance } in filteredVisibleAncestors"
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
            v-for="{ concept: row, distance } in visibleDescendantRows"
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
