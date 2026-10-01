<script setup lang="ts">
import { AtlasChip, AtlasProgressCircular } from '@/components/ui'
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
  expandable?: boolean
  expanded?: boolean
  loading?: boolean
  failed?: boolean
  leaf?: boolean
  showExpansionColumn?: boolean
}>()

const emit = defineEmits<{
  'toggle-select': []
  navigate: [conceptId: number]
  'toggle-expand': []
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
      <div class="concept-cell">
        <span
          v-if="showExpansionColumn"
          class="expand-column"
          data-testid="hierarchy-expand-column"
        >
          <button
            v-if="expandable"
            type="button"
            class="expand-toggle"
            :data-testid="`hierarchy-expand-${row.conceptId}`"
            :aria-label="expanded
              ? t('components.conceptHierarchyDialog.collapseConcept', 'Collapse {name}', { name: row.conceptName }).value
              : t('components.conceptHierarchyDialog.expandConcept', 'Expand {name}', { name: row.conceptName }).value"
            :aria-expanded="expanded"
            @click="emit('toggle-expand')"
          >
            {{ expanded ? '−' : '+' }}
          </button>
          <AtlasProgressCircular
            v-else-if="loading"
            class="expand-loading"
            :data-testid="`hierarchy-loading-${row.conceptId}`"
            indeterminate
            size="16"
          />
          <span
            v-else-if="leaf"
            class="expand-toggle expand-toggle--leaf"
            :data-testid="`hierarchy-expand-${row.conceptId}`"
            aria-hidden="true"
          >
            +
          </span>
        </span>
        <span class="concept-content">
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
          <button
            v-if="failed"
            type="button"
            class="expand-retry"
            :data-testid="`hierarchy-retry-${row.conceptId}`"
            @click="emit('toggle-expand')"
          >
            {{ t('components.conceptHierarchyDialog.expandFailed', 'Could not load children').value }}
          </button>
        </span>
      </div>
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
.concept-cell { align-items: flex-start; display: flex; }
.expand-column { flex: 0 0 24px; padding-top: 1px; }
.concept-content { min-width: 0; }
.concept-link { background: none; border: none; color: inherit; cursor: pointer; font: inherit; padding: 0; text-align: left; }
.concept-link:hover { text-decoration: underline; }
.expand-toggle { background: none; border: none; cursor: pointer; font-size: 16px; line-height: 1; padding: 0 4px; }
.expand-toggle--leaf { color: currentColor; cursor: default; display: inline-block; opacity: 0.35; }
.expand-loading { display: inline-flex; vertical-align: middle; }
.expand-retry { background: none; border: none; color: rgb(var(--v-theme-error)); cursor: pointer; font: inherit; margin-left: 6px; padding: 0; text-decoration: underline; }
</style>

