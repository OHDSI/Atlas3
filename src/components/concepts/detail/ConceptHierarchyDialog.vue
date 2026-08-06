<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { AtlasDialog, AtlasProgressCircular } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useConceptDetailStore } from '@/stores/concept-detail'
import { useConceptHierarchyStore } from '@/stores/concept-hierarchy'
import type { Concept } from '@/models/concept-set.types'
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
    return [self, ...flatten(tree.childrenOf(row.conceptId), depth + 1, [...path, row.conceptId])]
  })
}

const treeRows = computed(() => flatten(descendants.value, 0, []))

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

      <table class="hierarchy-table">
        <thead>
          <tr>
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
            <td colspan="7">
              {{ t('components.conceptHierarchyDialog.ancestors', 'Ancestors').value }}
            </td>
          </tr>
          <tr
            v-for="a in ancestors"
            :key="`a-${a.conceptId}`"
            :data-testid="`hierarchy-row-${a.conceptId}`"
            class="ancestor"
          >
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
            <tr
              :data-testid="`hierarchy-row-${row.conceptId}`"
              :data-descendant-row="depth === 0 ? '' : undefined"
              class="descendant"
            >
              <td :style="{ paddingLeft: `${8 + depth * 24}px` }">
                <button
                  v-if="!tree.isLeaf(row.conceptId)"
                  type="button"
                  class="chev"
                  :data-testid="`hierarchy-expand-${row.conceptId}`"
                  @click="toggle(row)"
                >
                  {{ tree.isExpanded(row.conceptId) ? '▾' : '▸' }}
                </button>
                {{ row.conceptName }}
              </td>
              <td>{{ row.conceptCode }}</td>
              <td>{{ row.conceptClassId }}</td>
              <td>{{ row.domainId }}</td>
              <td>{{ row.vocabularyId }}</td>
              <td class="num">
                {{ counts(row.conceptId)?.recordCount ?? '—' }}
              </td>
              <td class="num">
                {{ counts(row.conceptId)?.descendantRecordCount ?? '—' }}
              </td>
            </tr>

            <tr
              v-if="tree.isLoading(row.conceptId)"
              :data-testid="`hierarchy-loading-${row.conceptId}`"
            >
              <td colspan="7">
                <AtlasProgressCircular
                  indeterminate
                  size="14"
                />
              </td>
            </tr>

            <tr v-if="tree.hasFailed(row.conceptId)">
              <td colspan="7">
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
    </template>
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
.hierarchy-table td { border-bottom: 1px solid rgba(0, 0, 0, 0.06); padding: 5px 8px; }
.hierarchy-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.section-row td { font-size: 11px; text-transform: uppercase; opacity: 0.6; }
.ancestor { opacity: 0.8; }
.anchor { background: rgba(25, 118, 210, 0.12); font-weight: 600; }
.chev { background: none; border: none; cursor: pointer; padding: 0 6px 0 0; }
</style>
