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
      >
        <template #actions>
          <AtlasChip
            v-if="!store.loading && store.filteredSets.length > 0"
            size="sm"
            tone="primary"
            class="concept-set-list__count"
          >
            {{ countLabel }}
          </AtlasChip>

          <DisabledReasonTooltip :reason="createDisabledReason">
            <AtlasButton
              icon="mdi-plus"
              :disabled="!canCreate"
              @click="onAddClick"
            >
              {{ t('components.conceptSetBuilder.newConceptSet') }}
            </AtlasButton>
          </DisabledReasonTooltip>

          <EntityImportButton
            :label="t('common.import').value"
            testid="concept-sets-import"
            :disabled="!canCreate"
            :import-design="importDesign"
            @imported="onImported"
            @failed="(message: string) => { store.error = message }"
          />
        </template>
      </ConceptSetFilters>
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
        :items-per-page-text="t('datatable.itemsPerPage').value"
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
            v-if="displayTags(item.tags).length > 0"
            class="concept-set-list__tags"
          >
            <AtlasChip
              v-for="tag in displayTags(item.tags)"
              :key="tag.id || tag.name"
              size="sm"
              variant="flat"
              :style="{
                backgroundColor: tagColor(tag.color),
                color: tagContrastColor(tag.color),
                boxShadow: store.filters.selectedTags.includes(tag.name)
                  ? '0 0 0 2px rgb(var(--v-theme-primary))'
                  : undefined,
              }"
              @click.stop="store.toggleTagFilterSelection(tag.name)"
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
          {{ formatDate(lastTouchedDate(item)) }}
        </template>

        <!-- Author (Created By) -->
        <template #item.createdBy="{ item }">
          {{ getAuthorName(item.createdBy) }}
        </template>

        <!-- Actions Column — hover-only for a quieter list. -->
        <template #item.actions="{ item }">
          <div class="concept-set-list__actions">
            <AtlasIconButton
              title="Clone"
              v-bind="{ ariaLabel: t('common.duplicate').value }"
              icon="mdi-content-copy"
              variant="text"
              size="sm"
              :disabled="!canCreate || store.loading"
              @click.stop="onCopyClick(item.id)"
            />
            <AtlasIconButton
              :title="t('common.delete').value"
              v-bind="{ ariaLabel: t('common.delete').value }"
              icon="mdi-delete-outline"
              variant="text"
              tone="danger"
              size="sm"
              :disabled="!access.canDelete(item.id) || store.loading"
              @click.stop="onDeleteClick(item)"
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
            ? t('cs.manager.emptyFilterMessage')
            : t('cs.manager.emptyStateMessage')
        }}
      </p>
      <DisabledReasonTooltip :reason="createDisabledReason">
        <AtlasButton
          v-if="store.activeFilterCount === 0"
          icon="mdi-plus"
          :disabled="!canCreate"
          @click="onAddClick"
        >
          {{ t('components.conceptSetBuilder.newConceptSet') }}
        </AtlasButton>
      </DisabledReasonTooltip>
    </div>

    <AtlasDialog
      v-model="showNewDialog"
      :eyebrow="t('common.conceptSet').value"
      :title="t('components.conceptSetBuilder.newDialogTitle').value"
      max-width="500"
      @close="closeNewDialog"
    >
      <AtlasTextField
        v-model="newName"
        :label="t('components.conceptSetBuilder.conceptSetName').value"
        variant="outlined"
        :disabled="creating"
        data-testid="new-concept-set-name"
        @keyup.enter="confirmCreate"
      />
      <AtlasTextField
        v-model="newSearchTerms"
        :label="t('components.conceptSetBuilder.usingSearchTerms').value"
        :hint="t('components.conceptSetBuilder.usingSearchTermsHint').value"
        persistent-hint
        variant="outlined"
        class="mt-4"
        :disabled="creating"
        data-testid="new-concept-set-search-terms"
        @update:model-value="createError = ''"
        @keyup.enter="confirmCreate"
      />
      <AtlasAlert
        v-if="createError"
        severity="danger"
        class="mt-4"
        data-testid="new-concept-set-error"
      >
        {{ createError }}
      </AtlasAlert>
      <template #actions>
        <AtlasButton
          variant="ghost"
          :disabled="creating"
          @click="closeNewDialog"
        >
          {{ t('common.cancel') }}
        </AtlasButton>
        <AtlasButton
          :disabled="!newName.trim()"
          :loading="creating"
          data-testid="new-concept-set-create"
          @click="confirmCreate"
        >
          {{ t('common.create') }}
        </AtlasButton>
      </template>
    </AtlasDialog>

    <AtlasDialog
      v-model="showDeleteDialog"
      :eyebrow="t('common.confirm').value"
      :title="t('common.delete').value"
      max-width="440"
      @close="showDeleteDialog = false"
    >
      {{ t('cs.manager.deleteConfirmation').value }}
      "{{ selectedSet?.name }}"?
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="showDeleteDialog = false"
        >
          {{ t('common.cancel') }}
        </AtlasButton>
        <AtlasButton
          variant="danger"
          :loading="store.loading"
          @click="confirmDelete"
        >
          {{ t('common.delete') }}
        </AtlasButton>
      </template>
    </AtlasDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccessFor } from '@/composables/useEntityAccess'
import { formatDate, lastTouchedDate } from '@/utils/date-format'
import { tagColor, tagContrastColor } from '@/utils/tag-color'
import { displayTags } from '@/utils/asset-tags'
import type { ConceptSetListItem } from '@/models/concept-set.types'
import ConceptSetFilters from './ConceptSetFilters.vue'
import { AtlasAlert, AtlasButton, AtlasCard, AtlasChip, AtlasDataTable, AtlasDialog, AtlasIcon, AtlasIconButton, AtlasSkeleton, AtlasTextField } from '@/components/ui'
import EntityImportButton from '@/components/shared/EntityImportButton.vue'
import DisabledReasonTooltip from '@/components/shared/DisabledReasonTooltip.vue'
import { importConceptSet } from '@/services/concept-set.service'
import { findSeedConceptForSearchTerms, NoMatchingConceptError } from '@/services/concept-search.service'
import { useWebAPIStore } from '@/stores/webapi'
import { logger } from '@/utils/logger'

const { t } = useI18n()
const router = useRouter()
const { hasPermission } = usePermissions()
const canCreate = computed(() => hasPermission('create:conceptset'))
const access = useEntityAccessFor('conceptSet')
const createDisabledReason = computed(() =>
  canCreate.value ? '' : t('common.noPermission').value
)

// ============================================================================
// Store
// ============================================================================

const store = useConceptSetsStore()

// ============================================================================
// Local State
// ============================================================================

const itemsPerPage = ref(25)
const sortBy = ref([{ key: 'modifiedDate', order: 'desc' as const }])
const showDeleteDialog = ref(false)
const selectedSet = ref<ConceptSetListItem | null>(null)
const showNewDialog = ref(false)
const newName = ref('')
const newSearchTerms = ref('')
const createError = ref('')
const creating = ref(false)

const countLabel = computed(() => {
  const n = store.filteredSets.length
  // Pluralize as the design uses a short status chip.
  return n === 1 ? '1 set' : `${n} sets`
})

// ============================================================================
// Table Configuration
// ============================================================================

const headers = [
  { title: t('columns.id').value, key: 'id', sortable: true, width: '100px' },
  { title: t('columns.name').value, key: 'name', sortable: true },
  { title: t('common.tags').value, key: 'tags', sortable: false, width: '220px' },
  {
    title: t('columns.created').value,
    key: 'createdDate',
    sortable: true,
    width: '120px',
  },
  {
    title: t('columns.updated').value,
    key: 'modifiedDate',
    // Sorted off the same fallback the cell displays, so a set that was only
    // ever created orders by its creation date rather than sinking (#292).
    value: (item: unknown) => lastTouchedDate(item as ConceptSetListItem),
    sortable: true,
    width: '120px',
  },
  { title: t('columns.author').value, key: 'createdBy', sortable: true, width: '150px' },
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
  if (!canCreate.value) return
  newName.value = ''
  newSearchTerms.value = ''
  createError.value = ''
  showNewDialog.value = true
}

function closeNewDialog() {
  if (creating.value) return
  showNewDialog.value = false
}

// Same bar as Atlas 2.x: one term of 4+ characters, or at least two terms.
function isSearchTermsValid(terms: string): boolean {
  return terms.length >= 4 || terms.split(/\s+/).length >= 2
}

async function confirmCreate() {
  const name = newName.value.trim()
  const terms = newSearchTerms.value.trim()
  if (!name || creating.value || !canCreate.value) return

  if (!terms) {
    store.openCreateEditor(undefined, name)
    showNewDialog.value = false
    void router.push({ name: 'conceptset-new' })
    return
  }

  if (!isSearchTermsValid(terms)) {
    createError.value = t('components.conceptSetBuilder.searchTermsTooShort').value
    return
  }

  const webapiStore = useWebAPIStore()
  const vocabularySourceKey = webapiStore.getValidVocabularySource()
  const resultsSourceKey = webapiStore.getValidResultsSource()
  if (!vocabularySourceKey || !resultsSourceKey) {
    createError.value = t('components.conceptSetBuilder.searchTermsNoSource').value
    return
  }

  creating.value = true
  createError.value = ''
  try {
    const seed = await findSeedConceptForSearchTerms(vocabularySourceKey, resultsSourceKey, terms)
    store.openCreateEditor(undefined, name)
    store.addConceptToSet(seed, { includeDescendants: true })
    showNewDialog.value = false
    void router.push({ name: 'conceptset-new' })
  } catch (err) {
    createError.value =
      err instanceof NoMatchingConceptError
        ? t('components.conceptSetBuilder.searchTermsNoMatch', { terms }).value
        : t('components.conceptSetBuilder.searchTermsFailed').value
    logger.error('ConceptSetList', 'Failed to create concept set from search terms', err)
  } finally {
    creating.value = false
  }
}

async function onCopyClick(id: number | string | undefined) {
  if (id !== undefined) {
    const copied = await store.copy(id)
    if (copied?.id !== undefined && copied.id !== null) {
      await router.push({
        name: 'conceptset-edit',
        params: { id: String(copied.id) },
      })
    }
  }
}

function onDeleteClick(set: ConceptSetListItem) {
  selectedSet.value = set
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!selectedSet.value?.id) return
  const success = await store.remove(selectedSet.value.id)
  if (success) {
    showDeleteDialog.value = false
    selectedSet.value = null
  }
}

// Vuetify 3 v-data-table emits (event, { item }) for click:row.
function onRowClick(_event: Event, payload: { item: ConceptSetListItem }) {
  if (payload?.item?.id !== undefined) {
    void router.push({
      name: 'conceptset-edit',
      params: { id: String(payload.item.id) },
    })
  }
}

async function importDesign(
  design: unknown,
  meta: { fileName: string }
): Promise<{ id?: number | string }> {
  const created = await importConceptSet(design, meta.fileName)
  return { id: created.id }
}

async function onImported(entity: { id?: number | string }) {
  if (entity.id == null) return
  await store.fetchAll()
  await router.push({
    name: 'conceptset-edit',
    params: { id: String(entity.id) },
  })
}

defineExpose({ importDesign, onImported })
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
  gap: 8px;
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
