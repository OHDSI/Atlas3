<script setup lang="ts">
import { AtlasChip } from '@/components/ui'
import ConceptHierarchySelectCell from '@/components/concepts/detail/ConceptHierarchySelectCell.vue'
import { useI18n } from '@/composables/useI18n'
import { formatRecordCount } from '@/components/concepts/detail/record-count-format'
import type { RelatedConcept } from '@/models/concept-detail.types'

defineProps<{
  row: RelatedConcept
  depth: number
  canAdd: boolean
  selected: boolean
  expandable: boolean
  expanded: boolean
  inSet: boolean
  isExcluded: boolean
  includeDescendants: boolean
  recordCount: number | undefined
  descendantRecordCount: number | undefined
}>()

const emit = defineEmits<{ 'toggle-select': []; 'toggle-expand': [] }>()

const { t, tv } = useI18n()
</script>

<template>
  <tr
    :data-testid="`hierarchy-row-${row.conceptId}`"
    :data-descendant-row="depth === 0 ? '' : undefined"
    class="descendant"
  >
    <ConceptHierarchySelectCell
      :concept-id="row.conceptId"
      :concept-name="row.conceptName"
      :can-add="canAdd"
      :selected="selected"
      @toggle="emit('toggle-select')"
    />
    <td :style="{ paddingLeft: `${8 + depth * 24}px` }">
      <button
        v-if="expandable"
        type="button"
        class="chev"
        :aria-expanded="expanded"
        :aria-label="expanded
          ? tv('components.conceptHierarchyDialog.collapseConcept', 'Collapse {name}', { name: row.conceptName })
          : tv('components.conceptHierarchyDialog.expandConcept', 'Expand {name}', { name: row.conceptName })"
        :data-testid="`hierarchy-expand-${row.conceptId}`"
        @click="emit('toggle-expand')"
      >
        {{ expanded ? '▾' : '▸' }}
      </button>
      {{ row.conceptName }}
      <AtlasChip
        v-if="inSet"
        size="sm"
      >
        {{ t('components.conceptHierarchyDialog.inSet', 'in set').value }}
      </AtlasChip>
      <AtlasChip
        v-if="isExcluded"
        size="sm"
      >
        {{ t('components.conceptHierarchyDialog.excluded', 'excluded').value }}
      </AtlasChip>
      <AtlasChip
        v-if="includeDescendants"
        size="sm"
      >
        {{ t('components.conceptHierarchyDialog.withDescendants', '+desc').value }}
      </AtlasChip>
    </td>
    <td>{{ row.conceptCode }}</td>
    <td>{{ row.conceptClassId }}</td>
    <td>{{ row.domainId }}</td>
    <td>{{ row.vocabularyId }}</td>
    <td class="num">
      {{ formatRecordCount(recordCount) }}
    </td>
    <td class="num">
      {{ formatRecordCount(descendantRecordCount) }}
    </td>
  </tr>
</template>

<style scoped>
.chev { background: none; border: none; cursor: pointer; padding: 0 6px 0 0; }
</style>
