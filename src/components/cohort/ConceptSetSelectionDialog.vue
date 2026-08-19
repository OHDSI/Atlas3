<template>
  <Teleport to="body">
    <v-navigation-drawer
      :model-value="modelValue"
      location="right"
      temporary
      :width="drawerWidth"
      @update:model-value="emit('update:modelValue', $event)"
    >
      <div class="cs-picker">
        <!-- Header — eyebrow + accent rule + clean title; matches
             the modernised dialog pattern used elsewhere. -->
        <header class="cs-picker__header">
          <div class="cs-picker__title-block">
            <div class="cs-picker__eyebrow-row">
              <span class="text-eyebrow">{{ t('common.conceptSet', 'Concept set').value }}</span>
              <span class="cs-picker__accent-rule" />
            </div>
            <h2 class="cs-picker__title">
              {{ t('components.conceptSetBuilder.selectConceptSet', 'Select concept set').value }}
            </h2>
          </div>
          <AtlasIconButton
            icon="mdi-close"
            v-bind="{ ariaLabel: t('common.close', 'Close').value }"
            variant="text"
            size="sm"
            @click="close"
          />
        </header>

        <div class="cs-picker__body">
          <!-- Create a new empty concept set in this definition (#111). -->
          <div class="cs-picker__create-row">
            <AtlasButton
              icon="mdi-plus"
              variant="secondary"
              @click="onCreateNew"
            >
              {{ t('components.conceptSetBuilder.newConceptSet', 'New concept set').value }}
            </AtlasButton>
          </div>

          <!-- In-definition (local) concept sets (#111). Selecting one reuses it
               in place; importing from the repository below makes a fresh copy. -->
          <section
            v-if="selectableLocalSets.length > 0"
            class="cs-picker__local"
            data-testid="local-concept-sets"
          >
            <h3 class="cs-picker__section-title">
              {{ t('components.conceptSetBuilder.inThisDefinition', 'In this definition').value }}
            </h3>
            <AtlasCard padding="none">
              <button
                v-for="set in selectableLocalSets"
                :key="`local-${set.id}`"
                type="button"
                class="cs-picker__local-item"
                data-testid="local-concept-set-item"
                @click="onLocalSelect(set)"
              >
                <span class="cs-picker__name">{{ set.name }}</span>
                <AtlasChip
                  size="sm"
                  tone="neutral"
                  variant="outlined"
                >
                  {{ t('columns.id', 'ID').value }} {{ set.id }}
                </AtlasChip>
              </button>
            </AtlasCard>
          </section>

          <h3
            v-if="selectableLocalSets.length > 0"
            class="cs-picker__section-title"
          >
            {{ t('components.conceptSetBuilder.importFromRepository', 'Import from repository').value }}
          </h3>

          <!-- Toolbar: search + count chip + create-new button.
               Mirrors the toolbar on the /concepts list page. -->
          <div class="cs-picker__toolbar">
            <AtlasTextField
              v-model="searchTerm"
              :placeholder="t('common.search', 'Search concept sets…').value"
              prepend-icon="mdi-magnify"
              clearable
              variant="outlined"
              hide-details
              class="cs-picker__search"
            />

            <AtlasChip
              v-if="!loading && filteredSets.length > 0"
              size="sm"
              tone="primary"
              class="cs-picker__count"
            >
              {{ countLabel }}
            </AtlasChip>
          </div>

          <!-- Loading -->
          <AtlasProgressLinear
            v-if="loading"
            indeterminate
            class="cs-picker__loading"
          />

          <!-- Concept-set table — same visual treatment as
               /concepts: SurfaceCard, hover rows, click-to-select,
               hover-only edit icon. -->
          <AtlasCard
            v-if="loading || filteredSets.length > 0"
            padding="none"
          >
            <AtlasDataTable
              v-model:sort-by="sortBy"
              :headers="headers"
              :items="filteredSets"
              :loading="loading"
              :items-per-page="itemsPerPage"
              :items-per-page-text="t('datatable.itemsPerPage', 'Rows per page:').value"
              hover
              class="cs-picker__table"
              @click:row="onRowClick"
            >
              <template #item.name="{ item }">
                <span class="cs-picker__name">{{ item.name }}</span>
              </template>

              <template #item.createdDate="{ item }">
                {{ formatDate(item.createdDate) }}
              </template>

              <template #item.modifiedDate="{ item }">
                {{ formatDate(item.modifiedDate) }}
              </template>

              <template #item.actions="{ item }">
                <div class="cs-picker__actions">
                  <AtlasIconButton
                    icon="mdi-pencil-outline"
                    v-bind="{ ariaLabel: t('common.edit', 'Edit').value }"
                    variant="text"
                    size="sm"
                    @click.stop="onEditClick(item)"
                  />
                </div>
              </template>

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

          <!-- Empty / filtered-empty state -->
          <div
            v-else
            class="cs-picker__empty"
          >
            <AtlasIcon
              :icon="searchTerm ? 'mdi-filter-off-outline' : 'mdi-bookmark-outline'"
              size="36"
              class="cs-picker__empty-icon"
            />
            <p class="cs-picker__empty-text">
              {{
                searchTerm
                  ? t('search.noResultsFoundFor', 'No concept sets match your search.').value
                  : t(
                    'cohortDefinitions.noConceptSets',
                    'No concept sets yet — create one to get started.'
                  ).value
              }}
            </p>
            <AtlasButton
              v-if="!searchTerm"
              icon="mdi-plus"
              @click="onCreateNew"
            >
              {{ t('components.conceptSetBuilder.newConceptSet', 'New concept set').value }}
            </AtlasButton>
            <AtlasButton
              v-else
              size="sm"
              variant="secondary"
              icon="mdi-close"
              @click="searchTerm = ''"
            >
              {{ t('common.clearSearch', 'Clear search').value }}
            </AtlasButton>
          </div>
        </div>
      </div>
    </v-navigation-drawer>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ConceptSetListItem } from '@/models/concept-set.types'
import type { ConceptSetReference } from '@/models/cohort.types'
import { AtlasButton, AtlasCard, AtlasChip, AtlasDataTable, AtlasIcon, AtlasIconButton, AtlasProgressLinear, AtlasSkeleton, AtlasTextField } from '@/components/ui'
import { formatDate } from '@/utils/date-format'
import { hasNumericConceptSetId } from '@/utils/concept-set-id'

defineOptions({ name: 'ConceptSetSelectionDialog' })

interface Props {
  modelValue: boolean
  /**
   * Concept sets already embedded in the cohort definition (#111). Selecting one
   * reuses it in-place; the repository table below imports a fresh copy instead.
   */
  localConceptSets?: ConceptSetReference[]
}

const props = withDefaults(defineProps<Props>(), {
  localConceptSets: () => [],
})
const { t, tv } = useI18n()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'local-concept-set-selected': [conceptSet: ConceptSetReference]
  'concept-set-selected': [conceptSet: ConceptSetListItem]
  'edit-concept-set': [conceptSet: ConceptSetListItem]
  'create-new': []
}>()

const conceptSetsStore = useConceptSetsStore()
const searchTerm = ref('')
const loading = computed(() => conceptSetsStore.loading)
const itemsPerPage = ref(25)
const sortBy = ref([{ key: 'modifiedDate', order: 'desc' as const }])

// Match the editor's drawer width behaviour.
const drawerWidth = computed(() => window.innerWidth - 100)

const filteredSets = computed(() => {
  const sets = conceptSetsStore.conceptSets
  if (!searchTerm.value) return sets
  const term = searchTerm.value.toLowerCase()
  return sets.filter(set => set.name.toLowerCase().includes(term))
})

const countLabel = computed(() => {
  const n = filteredSets.value.length
  return n === 1
    ? tv('components.conceptSetPicker.setCountOne', '1 set')
    : tv('components.conceptSetPicker.setCountOther', '{count} sets', { count: n })
})

const headers = [
  { title: t('columns.id', 'ID').value, key: 'id', sortable: true, width: '80px' },
  { title: t('columns.name', 'Name').value, key: 'name', sortable: true },
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
  { title: '', key: 'actions', sortable: false, width: '56px', align: 'end' as const },
]

watch(
  () => props.modelValue,
  async isOpen => {
    if (isOpen && conceptSetsStore.conceptSets.length === 0) {
      await conceptSetsStore.fetchAll()
    }
    if (!isOpen) {
      searchTerm.value = ''
    }
  }
)

// Only sets with a real (positive numeric) id are selectable. The cohort seeds
// not-yet-filled criteria with a placeholder { id: 0|null, name: 'Select…' }
// concept set; those would otherwise surface here as bogus "Select concept set…"
// rows that mint an empty set when clicked.
const selectableLocalSets = computed(() => props.localConceptSets.filter(hasNumericConceptSetId))

function onLocalSelect(ref: ConceptSetReference) {
  emit('local-concept-set-selected', ref)
  close()
}

function onRowClick(_event: Event, payload: { item: ConceptSetListItem }) {
  if (payload?.item) {
    emit('concept-set-selected', payload.item)
    close()
  }
}

function onEditClick(conceptSet: ConceptSetListItem) {
  emit('edit-concept-set', conceptSet)
}

function onCreateNew() {
  emit('create-new')
}

function close() {
  emit('update:modelValue', false)
  searchTerm.value = ''
}
</script>

<style scoped>
.cs-picker {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-surface));
}

.cs-picker__header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 28px 14px;
}

.cs-picker__title-block {
  flex: 1;
  min-width: 0;
}

.cs-picker__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.cs-picker__accent-rule {
  display: inline-block;
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}

.cs-picker__title {
  font-size: 22px;
  font-weight: 500;
  line-height: 1.3;
  margin: 0;
  color: rgb(var(--v-theme-primary));
}

.cs-picker__body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 28px 24px;
}

.cs-picker__create-row {
  display: flex;
  margin-bottom: 16px;
}

.cs-picker__section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 0 0 8px;
}

.cs-picker__local {
  margin-bottom: 20px;
}

.cs-picker__local-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
  text-align: left;
  cursor: pointer;
  transition: background 120ms ease;
}
.cs-picker__local-item:last-child {
  border-bottom: none;
}
.cs-picker__local-item:hover,
.cs-picker__local-item:focus-visible {
  background: rgb(var(--v-theme-surface-variant), 0.5);
}

.cs-picker__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.cs-picker__search {
  flex: 1 1 320px;
  max-width: 420px;
}

.cs-picker__count {
  align-self: center;
}

.cs-picker__loading {
  margin-bottom: 12px;
}

.cs-picker__name {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.cs-picker__table :deep(tbody tr) {
  cursor: pointer;
}

.cs-picker__actions {
  display: flex;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 120ms ease;
}
.cs-picker__table :deep(tbody tr:hover) .cs-picker__actions,
.cs-picker__table :deep(tbody tr:focus-within) .cs-picker__actions {
  opacity: 1;
}

.cs-picker__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 24px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface-variant));
}

.cs-picker__empty-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
}

.cs-picker__empty-text {
  margin: 0;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
  text-align: center;
  max-width: 480px;
}
</style>
