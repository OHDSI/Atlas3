<template>
  <div class="concept-table">
    <v-data-table
      :headers="headers"
      :items="concepts"
      :loading="loading"
      :items-per-page="itemsPerPage"
      :page="page"
      hide-default-footer
      class="elevation-1"
    >
      <!-- Concept Type Badge -->
      <template #item.standardConcept="{ item }">
        <v-chip
          :color="getConceptTypeColor(item)"
          size="small"
          label
        >
          {{ getConceptTypeLabel(item) }}
        </v-chip>
      </template>

      <!-- Validity Badge -->
      <template #item.invalidReason="{ item }">
        <v-chip
          :color="item.invalidReason ? 'error' : 'success'"
          size="small"
          label
        >
          {{ item.invalidReason ? t('commonErrors.invalid', 'Invalid').value : t('commonErrors.valid', 'Valid').value }}
        </v-chip>
      </template>

      <!-- Record Count Columns - Format with commas or dash if undefined, show spinner while loading -->
      <template #item.recordCount="{ item }">
        <div class="d-flex align-center justify-end">
          <v-progress-circular
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
          <v-progress-circular
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
          <v-progress-circular
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
          <v-progress-circular
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
          <v-btn
            v-if="!conceptsInSet.has(item.conceptId)"
            color="primary"
            variant="outlined"
            size="small"
            prepend-icon="mdi-plus"
            @click="onAddConcept(item)"
          >
            Add
          </v-btn>
          <v-btn
            v-else
            color="error"
            variant="outlined"
            size="small"
            prepend-icon="mdi-minus"
            @click="onRemoveConcept(item)"
          >
            Remove
          </v-btn>
        </div>
      </template>

      <!-- No data message -->
      <template #no-data>
        <div class="text-center py-8">
          <v-icon
            size="64"
            color="grey-lighten-1"
          >
            mdi-database-search
          </v-icon>
          <p class="text-body-1 mt-4 text-grey">
            {{ loading ? 'Loading...' : 'No records to display' }}
          </p>
        </div>
      </template>

      <!-- Loading skeleton -->
      <template #loading>
        <v-skeleton-loader
          v-for="i in 5"
          :key="i"
          type="table-row"
          class="mx-2"
        />
      </template>
    </v-data-table>

    <!-- Custom pagination -->
    <div class="d-flex align-center justify-space-between pa-4">
      <div class="text-body-2">
        {{ pageRangeText }}
      </div>

      <div class="d-flex align-center gap-2">
        <span class="text-body-2">Items per page:</span>
        <v-select
          :model-value="itemsPerPage"
          :items="[60, 120, 240]"
          density="compact"
          variant="outlined"
          hide-details
          style="width: 80px"
          @update:model-value="onItemsPerPageChange"
        />
      </div>

      <v-pagination
        :model-value="page"
        :length="totalPages"
        :total-visible="7"
        @update:model-value="onPageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { Concept } from '@/models/concept-set.types'

const { t } = useI18n()

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
  conceptsInSet?: Set<number>  // Track which concepts are already in set
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  loadingRecordCounts: false,
  page: 1,
  itemsPerPage: 60,
  showAddButton: false,
  conceptsInSet: () => new Set(),
})

const emit = defineEmits<{
  'update:page': [page: number]
  'update:itemsPerPage': [itemsPerPage: number]
  'update:sortBy': [sortBy: string]
  'update:sortDesc': [sortDesc: boolean]
  'add-concept': [concept: Concept]
  'remove-concept': [concept: Concept]
}>()

// ============================================================================
// Table Configuration
// ============================================================================

// Add actions column if showAddButton is true
const headers = computed(() => {
  const baseHeaders = [
    { title: t('columns.conceptId', 'ID').value, key: 'conceptId', sortable: true, width: '100px' },
    { title: t('columns.conceptCode', 'Code').value, key: 'conceptCode', sortable: true, width: '120px' },
    { title: t('columns.conceptName', 'Name').value, key: 'conceptName', sortable: true },
    { title: t('columns.vocabulary', 'Vocabulary').value, key: 'vocabularyId', sortable: true, width: '120px' },
    { title: t('columns.type', 'Type').value, key: 'standardConcept', sortable: true, width: '140px' },
    { title: t('columns.domain', 'Domain').value, key: 'domainId', sortable: true, width: '120px' },
    { title: t('columns.class', 'Class').value, key: 'conceptClassId', sortable: true, width: '150px' },
    { title: t('columns.validEndDate', 'Validity').value, key: 'invalidReason', sortable: true, width: '100px' },
    { title: t('columns.rcTooltip', 'RC').value, key: 'recordCount', sortable: true, width: '100px', align: 'end' as const },
    { title: t('columns.drcTooltip', 'DRC').value, key: 'descendantRecordCount', sortable: true, width: '100px', align: 'end' as const },
    { title: t('columns.pcTooltip', 'PC').value, key: 'personCount', sortable: true, width: '100px', align: 'end' as const },
    { title: t('columns.dpcTooltip', 'DPC').value, key: 'descendantPersonCount', sortable: true, width: '100px', align: 'end' as const },
  ]

  if (props.showAddButton) {
    return [...baseHeaders, { title: '', key: 'actions', sortable: false, width: '100px' }]
  }

  return baseHeaders
})

// ============================================================================
// Computed
// ============================================================================

const totalPages = computed(() => {
  return Math.ceil(props.totalItems / props.itemsPerPage)
})

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
</style>
