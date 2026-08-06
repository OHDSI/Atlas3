<script setup lang="ts">
import { AtlasChip } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
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

const { t } = useI18n()
</script>

<template>
  <tr
    :data-testid="`hierarchy-row-${row.conceptId}`"
    :data-descendant-row="depth === 0 ? '' : undefined"
    class="descendant"
  >
    <td>
      <v-checkbox-btn
        v-if="canAdd"
        :model-value="selected"
        density="compact"
        hide-details
        :data-testid="`hierarchy-select-${row.conceptId}`"
        @update:model-value="emit('toggle-select')"
      />
    </td>
    <td :style="{ paddingLeft: `${8 + depth * 24}px` }">
      <button
        v-if="expandable"
        type="button"
        class="chev"
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
      {{ recordCount ?? '—' }}
    </td>
    <td class="num">
      {{ descendantRecordCount ?? '—' }}
    </td>
  </tr>
</template>

<style scoped>
.hierarchy-table td { border-bottom: 1px solid rgba(0, 0, 0, 0.06); padding: 5px 8px; }
.hierarchy-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.chev { background: none; border: none; cursor: pointer; padding: 0 6px 0 0; }
</style>
