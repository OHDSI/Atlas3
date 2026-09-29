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
  distance?: number
  showDistance: boolean
  inSet: boolean
  isExcluded: boolean
  includeDescendants: boolean
  recordCount: number | undefined
  descendantRecordCount: number | undefined
}>()

const emit = defineEmits<{
  'toggle-select': []
  navigate: [conceptId: number]
}>()

const { t } = useI18n()
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
        type="button"
        class="concept-link"
        :data-testid="`hierarchy-navigate-${row.conceptId}`"
        @click="emit('navigate', row.conceptId)"
      >
        {{ row.conceptName }}
      </button>
      <span
        v-if="showDistance && distance !== undefined"
        class="dist"
      >{{ t('components.conceptHierarchyDialog.descendantDistance', 'distance {distance}', { distance }).value }}</span>
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
.dist { font-size: 11px; opacity: 0.55; margin-left: 6px; }
.concept-link { background: none; border: none; color: inherit; cursor: pointer; font: inherit; padding: 0; text-align: left; }
.concept-link:hover { text-decoration: underline; }
</style>

