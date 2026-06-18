<template>
  <div class="concept-set-list">
    <!-- Toolbar: search + status chip + primary action.
         Sits directly on the page card surface — no inner v-card. -->
    <div class="concept-set-list__toolbar">
      <ConceptSetFilters
        :filters="store.filters"
        :available-authors="store.availableAuthors"
        :available-tags="store.availableTags"
        :active-filter-count="store.activeFilterCount"
        class="concept-set-list__filters"
        @update:filters="store.setFilters"
        @clear="store.clearFilters"
      />

      <AtlasChip
        v-if="!store.loading && store.filteredSets.length > 0"
        size="sm"
        tone="primary"
        class="concept-set-list__count"
      >
        {{ countLabel }}
      </AtlasChip>

      <AtlasSpacer />

      <AtlasButton
        icon="mdi-plus"
        :disabled="!canCreate"
        @click="onAddClick"
      >
        {{ t('components.conceptSetBuilder.newConceptSet', 'New concept set') }}
      </AtlasButton>
    </div>

    <!-- Error Alert -->
    <AtlasAlert
      v-if="store.error"
      severity="danger"
      :closable="true"
      class="mb-4"
      @close="store.clearError()"
    >
      {{ store.error }}
    </AtlasAlert>

    <!-- Concept Sets Table -->
    <AtlasCard
      v-if="store.loading || store.filteredSets.length > 0"
      padding="none"
    >
      <AtlasDataTable
        v-model:sort-by="sortBy"
        :headers="headers"
        :items="store.filteredSets"
        :loading="store.loading"
        :items-per-page="itemsPerPage"
        :items-per-page-text="t('datatable.itemsPerPage', 'Rows per page:').value"
        hover
        class="concept-set-list__table"
        @click:row="onRowClick"
      >
        <!-- Name -->
        <template #item.name="{ item }">
          <span class="concept-set-list__name">{{ item.name }}</span>
        </template>

        <!-- Tags -->
        <template #item.tags="{ item }">
          <div
            v-if="item.tags && item.tags.length > 0"
            class="concept-set-list__tags"
          >
            <AtlasChip
              v-for="tag in item.tags"
              :key="tag.id || tag.name"
              size="sm"
              variant="flat"
              :style="{ backgroundColor: tagColor(tag.color), color: tagContrastColor(tag.color) }"
            >
              {{ tag.name }}
            </AtlasChip>
          </div>
        </template>

        <!-- Created Date -->
        <template #item.createdDate="{ item }">
          {{ formatDate(item.createdDate) }}
        </template>

        <!-- Modified Date -->
        <template #item.modifiedDate="{ item }">
          {{ formatDate(item.modifiedDate) }}
        </template>

        <!-- Author (Created By) -->
        <template #item.createdBy="{ item }">
          {{ getAuthorName(item.createdBy) }}
        </template>

        <!-- Actions Column — hover-only for a quieter list. -->
        <template #item.actions="{ item }">
          <div class="concept-set-list__actions">
            <AtlasIconButton
              icon="mdi-pencil-outline"
              v-bind="{ ariaLabel: 'Edit' }"
              variant="text"
              size="sm"
              :disabled="!access.canWrite(item.id)"
              @click.stop="onEditClick(item.id)"
            />
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
    </AtlasCard>

    <!-- Empty state: filled MD3 container, no border. Sits where the
         table would have been so the toolbar above stays the focus. -->
    <div
      v-else
      class="concept-set-list__empty"
    >
      <AtlasIcon
        icon="mdi-shape"
        size="36"
        class="concept-set-list__empty-icon"
      />
      <p class="concept-set-list__empty-text">
        {{
          store.activeFilterCount > 0
            ? t('cs.manager.emptyFilterMessage', 'No concept sets match your search.')
            : t(
              'cs.manager.emptyStateMessage',
              'No concept sets yet — create one to start curating concepts.'
            )
        }}
      </p>
      <AtlasButton
        v-if="store.activeFilterCount === 0"
        icon="mdi-plus"
        @click="onAddClick"
      >
        {{ t('components.conceptSetBuilder.newConceptSet', 'New concept set') }}
      </AtlasButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccessFor } from '@/composables/useEntityAccess'
import { formatDate } from '@/utils/date-format'
import { tagColor, tagContrastColor } from '@/utils/tag-color'
import type { ConceptSetListItem } from '@/models/concept-set.types'
import ConceptSetFilters from './ConceptSetFilters.vue'
import { AtlasAlert, AtlasButton, AtlasCard, AtlasChip, AtlasDataTable, AtlasIcon, AtlasIconButton, AtlasSkeleton, AtlasSpacer } from '@/components/ui'

const { t } = useI18n()
const { hasPermission } = usePermissions()
const canCreate = computed(() => hasPermission('create:conceptset'))
const access = useEntityAccessFor('conceptSet')

// ============================================================================
// Store
// ============================================================================

const store = useConceptSetsStore()

// ============================================================================
// Local State
// ============================================================================

const itemsPerPage = ref(25)
const sortBy = ref([{ key: 'modifiedDate', order: 'desc' as const }])

const countLabel = computed(() => {
  const n = store.filteredSets.length
  // Pluralize as the design uses a short status chip.
  return n === 1 ? '1 set' : `${n} sets`
})

// ============================================================================
// Table Configuration
// ============================================================================

const headers = [
  { title: t('columns.id', 'ID').value, key: 'id', sortable: true, width: '100px' },
  { title: t('columns.name', 'Name').value, key: 'name', sortable: true },
  { title: t('common.tags', 'Tags').value, key: 'tags', sortable: false, width: '220px' },
  {
    title: t('columns.created', 'Created').value,
    key: 'createdDate',
    sortable: true,
    width: '120px',
  },
  {
    title: t('columns.updated', 'Updated').value,
    key: 'modifiedDate',
    sortable: true,
    width: '120px',
  },
  { title: t('columns.author', 'Author').value, key: 'createdBy', sortable: true, width: '150px' },
  { title: '', key: 'actions', sortable: false, width: '80px', align: 'center' as const },
]

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(async () => {
  await store.fetchAll()
})

// ============================================================================
// Methods
// ============================================================================

function getAuthorName(
  author: string | { id: number; name: string | null; login: string } | undefined
): string {
  if (!author) return ''
  if (typeof author === 'string') return author
  return author.name || author.login || ''
}

function onAddClick() {
  store.openCreateEditor()
}

function onEditClick(id: number | string | undefined) {
  if (id !== undefined) {
    store.openEditEditor(id)
  }
}

// Vuetify 3 v-data-table emits (event, { item }) for click:row.
function onRowClick(_event: Event, payload: { item: ConceptSetListItem }) {
  if (payload?.item?.id !== undefined) {
    store.openEditEditor(payload.item.id)
  }
}
</script>

<style scoped>
.concept-set-list {
  width: 100%;
}

.concept-set-list__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.concept-set-list__filters {
  flex: 1 1 auto;
}

.concept-set-list__count {
  /* Tonal chip aligned with the search input height. */
  align-self: center;
}

.concept-set-list__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.concept-set-list__name {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

/* Row pointer affordance — rows are clickable to open the editor. */
.concept-set-list__table :deep(tbody tr) {
  cursor: pointer;
}

/* Hover-only action icons keeps the long list reading as data first.
 * Focus-within handles keyboard users and the always-visible state
 * during editing flows. */
.concept-set-list__actions {
  display: flex;
  justify-content: center;
  opacity: 0;
  transition: opacity 120ms ease;
}
.concept-set-list__table :deep(tbody tr:hover) .concept-set-list__actions,
.concept-set-list__table :deep(tbody tr:focus-within) .concept-set-list__actions {
  opacity: 1;
}

.concept-set-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 24px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface-variant));
}

.concept-set-list__empty-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
}

.concept-set-list__empty-text {
  margin: 0;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
  text-align: center;
}
</style>
