<template>
  <div class="concept-table">
    <AtlasDataTable
      v-model:sort-by="sortBy"
      :headers="headers"
      :items="concepts"
      :loading="loading"
      :items-per-page="itemsPerPage"
      :page="page"
      hide-default-footer
      class="elevation-1"
    >
      <template
        v-if="selectable"
        #header.select
      >
        <div :data-testid="'concept-table-select-all'">
          <v-checkbox-btn
            :model-value="allVisibleSelected"
            :indeterminate="someVisibleSelected && !allVisibleSelected"
            aria-label="Select all concepts"
            density="compact"
            hide-details
            @update:model-value="onToggleSelectAll"
          />
        </div>
      </template>

      <template
        v-if="selectable"
        #item.select="{ item }"
      >
        <div :data-testid="`concept-table-row-checkbox-${item.conceptId}`">
          <v-checkbox-btn
            :model-value="isSelected(item.conceptId)"
            :aria-label="`Select ${item.conceptName}`"
            density="compact"
            hide-details
            @update:model-value="(v: boolean | null) => onToggleRow(item.conceptId, v)"
          />
        </div>
      </template>

      <!-- Concept Type Badge -->
      <template #item.standardConcept="{ item }">
        <AtlasChip
          :color="getConceptTypeColor(item)"
          size="sm"
          label
        >
          {{ getConceptTypeLabel(item) }}
        </AtlasChip>
      </template>

      <!-- Validity Badge -->
      <template #item.invalidReason="{ item }">
        <AtlasChip
          :color="item.invalidReason ? 'error' : 'success'"
          size="sm"
          label
        >
          {{
            item.invalidReason
              ? t('commonErrors.invalid', 'Invalid').value
              : t('commonErrors.valid', 'Valid').value
          }}
        </AtlasChip>
      </template>

      <!-- Concept Name Link (opens the side-panel detail drawer) -->
      <template
        v-if="linkable && resolvedSourceKey"
        #item.conceptName="{ item }"
      >
        <a
          href="#"
          :data-testid="`concept-name-link-${item.conceptId}`"
          class="concept-name-link"
          @click.prevent="openConceptDetail(item)"
        >
          {{ item.conceptName }}
        </a>
      </template>

      <!-- Record Count Columns - Format with commas or dash if undefined, show spinner while loading -->
      <template #item.recordCount="{ item }">
        <div class="d-flex align-center justify-end">
          <AtlasProgressCircular
            v-if="loadingRecordCounts && item.recordCount === undefined"
            indeterminate
            size="16"
            width="2"
            color="primary"
          />
          <span
            v-else
            class="text-right"
          >{{ formatCount(item.recordCount) }}</span>
        </div>
      </template>

      <template #item.descendantRecordCount="{ item }">
        <div class="d-flex align-center justify-end">
          <AtlasProgressCircular
            v-if="loadingRecordCounts && item.descendantRecordCount === undefined"
            indeterminate
            size="16"
            width="2"
            color="primary"
          />
          <span
            v-else
            class="text-right"
          >{{ formatCount(item.descendantRecordCount) }}</span>
        </div>
      </template>

      <template #item.personCount="{ item }">
        <div class="d-flex align-center justify-end">
          <AtlasProgressCircular
            v-if="loadingRecordCounts && item.personCount === undefined"
            indeterminate
            size="16"
            width="2"
            color="primary"
          />
          <span
            v-else
            class="text-right"
          >{{ formatCount(item.personCount) }}</span>
        </div>
      </template>

      <template #item.descendantPersonCount="{ item }">
        <div class="d-flex align-center justify-end">
          <AtlasProgressCircular
            v-if="loadingRecordCounts && item.descendantPersonCount === undefined"
            indeterminate
            size="16"
            width="2"
            color="primary"
          />
          <span
            v-else
            class="text-right"
          >{{ formatCount(item.descendantPersonCount) }}</span>
        </div>
      </template>

      <!-- Actions Column - Add/Remove Button -->
      <template
        v-if="showAddButton"
        #item.actions="{ item }"
      >
        <div class="d-flex justify-center">
          <AtlasButton
            v-if="!conceptsInSet.has(item.conceptId)"
            variant="secondary"
            size="sm"
            icon="mdi-plus"
            @click="onAddConcept(item)"
          >
            Add
          </AtlasButton>
          <AtlasButton
            v-else
            variant="secondary"
            tone="danger"
            size="sm"
            icon="mdi-minus"
            @click="onRemoveConcept(item)"
          >
            Remove
          </AtlasButton>
        </div>
      </template>

      <!-- No data message -->
      <template #no-data>
        <div class="text-center py-8">
          <AtlasIcon
            size="64"
            color="grey-lighten-1"
          >
            mdi-database-search
          </AtlasIcon>
          <p class="text-body-1 mt-4 text-grey">
            {{ loading ? 'Loading...' : 'No records to display' }}
          </p>
        </div>
      </template>

      <!-- Loading skeleton -->
      <template #loading>
        <AtlasSkeleton
          v-for="i in 5"
          :key="i"
          type="table-row"
          class="mx-2"
        />
      </template>
    </AtlasDataTable>

    <!-- Custom pagination -->
    <div class="d-flex align-center justify-space-between pa-4">
      <div class="text-body-2">
        {{ pageRangeText }}
      </div>

      <div class="d-flex align-center gap-2">
        <span class="text-body-2">Items per page:</span>
        <AtlasSelect
          :model-value="itemsPerPage"
          :items="[60, 120, 240]"
          variant="outlined"
          hide-details
          style="width: 80px"
          @update:model-value="(v) => onItemsPerPageChange(v as number)"
        />
      </div>

      <AtlasPagination
        :model-value="page"
        :length="totalPages"
        :total-visible="7"
        @update:model-value="onPageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasChip, AtlasDataTable, AtlasIcon, AtlasPagination, AtlasProgressCircular, AtlasSelect, AtlasSkeleton } from '@/components/ui'
import { computed, ref, getCurrentInstance } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useWebAPIStore } from '@/stores/webapi'
import { useConceptDetailDrawerStore } from '@/stores/concept-detail-drawer'
import { getSourceKey as getDefaultSourceKey } from '@/config/webapi'
import type { Concept } from '@/models/concept-set.types'

const { t } = useI18n()
const webapiStore = useWebAPIStore()
const conceptDrawer = useConceptDetailDrawerStore()
const instance = getCurrentInstance()

// ============================================================================
// Local State
// ============================================================================

const sortBy = ref([{ key: 'conceptId', order: 'asc' as const }])

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  concepts: Concept[]
  loading?: boolean
  loadingRecordCounts?: boolean
  totalItems: number
  page?: number
  itemsPerPage?: number
  showAddButton?: boolean
  conceptsInSet?: Set<number> // Track which concepts are already in set
  selectable?: boolean // Render leading checkbox column for bulk selection
  selected?: number[] // v-model:selected — list of selected conceptIds
  linkable?: boolean
  sourceKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  loadingRecordCounts: false,
  page: 1,
  itemsPerPage: 60,
  showAddButton: false,
  conceptsInSet: () => new Set(),
  selectable: false,
  selected: () => [],
  linkable: true,
  sourceKey: undefined,
})

// Resolve a usable source key for detail-view links: explicit prop wins,
// otherwise fall back to the WebAPI store's vocabulary source, then the
// configured default. Without this fallback the row link silently
// disappears when a parent forgets to pass `:source-key`.
const resolvedSourceKey = computed(
  () => props.sourceKey || webapiStore.getValidVocabularySource() || getDefaultSourceKey() || '',
)

const emit = defineEmits<{
  'update:page': [page: number]
  'update:itemsPerPage': [itemsPerPage: number]
  'update:sortBy': [sortBy: string]
  'update:sortDesc': [sortDesc: boolean]
  'update:selected': [conceptIds: number[]]
  'add-concept': [concept: Concept]
  'remove-concept': [concept: Concept]
  'view-concept': [payload: { conceptId: number; sourceKey: string }]
}>()

// If a parent is listening for `view-concept`, emit and let them handle it
// (e.g., concept set editor renders the detail inline). Otherwise fall back
// to the global side-panel drawer. Declared emits are consumed before
// reaching $attrs, so we have to inspect the raw vnode props.
function hasViewConceptListener(): boolean {
  const vprops = (instance?.vnode.props ?? {}) as Record<string, unknown>
  return typeof vprops.onViewConcept === 'function'
}

function openConceptDetail(concept: Concept) {
  if (!resolvedSourceKey.value) return
  if (hasViewConceptListener()) {
    emit('view-concept', { conceptId: concept.conceptId, sourceKey: resolvedSourceKey.value })
    return
  }
  conceptDrawer.open(resolvedSourceKey.value, concept.conceptId)
}

// ============================================================================
// Table Configuration
// ============================================================================

// Add actions column if showAddButton is true
const headers = computed(() => {
  const baseHeaders = [
    { title: t('columns.conceptId', 'ID').value, key: 'conceptId', sortable: true, width: '100px' },
    {
      title: t('columns.conceptCode', 'Code').value,
      key: 'conceptCode',
      sortable: true,
      width: '120px',
    },
    { title: t('columns.conceptName', 'Name').value, key: 'conceptName', sortable: true },
    {
      title: t('columns.vocabulary', 'Vocabulary').value,
      key: 'vocabularyId',
      sortable: true,
      width: '120px',
    },
    {
      title: t('columns.type', 'Type').value,
      key: 'standardConcept',
      sortable: true,
      width: '140px',
    },
    { title: t('columns.domain', 'Domain').value, key: 'domainId', sortable: true, width: '120px' },
    {
      title: t('columns.class', 'Class').value,
      key: 'conceptClassId',
      sortable: true,
      width: '150px',
    },
    {
      title: t('columns.validEndDate', 'Validity').value,
      key: 'invalidReason',
      sortable: true,
      width: '100px',
    },
    {
      title: t('columns.rcTooltip', 'RC').value,
      key: 'recordCount',
      sortable: true,
      width: '100px',
      align: 'end' as const,
    },
    {
      title: t('columns.drcTooltip', 'DRC').value,
      key: 'descendantRecordCount',
      sortable: true,
      width: '100px',
      align: 'end' as const,
    },
    {
      title: t('columns.pcTooltip', 'PC').value,
      key: 'personCount',
      sortable: true,
      width: '100px',
      align: 'end' as const,
    },
    {
      title: t('columns.dpcTooltip', 'DPC').value,
      key: 'descendantPersonCount',
      sortable: true,
      width: '100px',
      align: 'end' as const,
    },
  ]

  let result = baseHeaders

  if (props.showAddButton) {
    result = [{ title: '', key: 'actions', sortable: false, width: '100px' }, ...result]
  }

  if (props.selectable) {
    result = [{ title: '', key: 'select', sortable: false, width: '48px' }, ...result]
  }

  return result
})

// ============================================================================
// Computed
// ============================================================================

const totalPages = computed(() => {
  return Math.ceil(props.totalItems / props.itemsPerPage)
})

const selectedSet = computed(() => new Set(props.selected))

const visibleIds = computed(() => props.concepts.map(c => c.conceptId))

const allVisibleSelected = computed(() => {
  if (visibleIds.value.length === 0) return false
  return visibleIds.value.every(id => selectedSet.value.has(id))
})

const someVisibleSelected = computed(() => {
  return visibleIds.value.some(id => selectedSet.value.has(id))
})

function isSelected(conceptId: number): boolean {
  return selectedSet.value.has(conceptId)
}

function onToggleRow(conceptId: number, value: boolean | null): void {
  const next = new Set(selectedSet.value)
  if (value) {
    next.add(conceptId)
  } else {
    next.delete(conceptId)
  }
  emit('update:selected', Array.from(next))
}

function onToggleSelectAll(value: boolean | null): void {
  const next = new Set(selectedSet.value)
  if (value) {
    for (const id of visibleIds.value) next.add(id)
  } else {
    for (const id of visibleIds.value) next.delete(id)
  }
  emit('update:selected', Array.from(next))
}

const pageRangeText = computed(() => {
  if (props.totalItems === 0) return '0-0 of 0'
  const start = (props.page - 1) * props.itemsPerPage + 1
  const end = Math.min(props.page * props.itemsPerPage, props.totalItems)
  return `${start}-${end} of ${props.totalItems}`
})

// ============================================================================
// Methods
// ============================================================================

function getConceptTypeColor(concept: Concept): string {
  if (concept.standardConcept === 'S') return 'primary'
  if (concept.standardConcept === 'C') return 'info'
  return 'default'
}

function getConceptTypeLabel(concept: Concept): string {
  if (concept.standardConcept === 'S') return t('search.standard', 'Standard').value
  if (concept.standardConcept === 'C') return t('search.classification', 'Classification').value
  return t('search.nonStandard', 'Non-Standard').value
}

function onPageChange(newPage: number) {
  emit('update:page', newPage)
}

function onItemsPerPageChange(newItemsPerPage: number) {
  emit('update:itemsPerPage', newItemsPerPage)
  // Reset to first page when changing items per page
  emit('update:page', 1)
}

function onAddConcept(concept: Concept) {
  emit('add-concept', concept)
}

function onRemoveConcept(concept: Concept) {
  emit('remove-concept', concept)
}

function formatCount(count: number | undefined): string {
  if (count === undefined || count === null) {
    return '-'
  }
  return count.toLocaleString()
}
</script>

<style scoped>
.concept-table {
  width: 100%;
}

.gap-2 {
  gap: 8px;
}

.concept-name-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.concept-name-link:hover {
  text-decoration: underline;
}
</style>
