<template>
  <div class="concept-set-list">
    <!-- Header with Search and Add Button -->
    <v-card
      flat
      class="mb-4"
    >
      <v-card-text>
        <div class="d-flex align-center justify-space-between gap-4">
          <v-text-field
            :model-value="store.filterTerm"
            :placeholder="t('common.search', 'Search').value"
            prepend-inner-icon="mdi-magnify"
            clearable
            variant="outlined"
            density="comfortable"
            hide-details
            style="max-width: 400px;"
            @update:model-value="onFilterChange"
            @click:clear="onFilterClear"
          />

          <v-btn
            color="primary"
            variant="flat"
            @click="onAddClick"
          >
            {{ t('components.conceptSetBuilder.newConceptSet', 'Add concept set') }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Error Alert -->
    <v-alert
      v-if="store.error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="store.clearError()"
    >
      {{ store.error }}
    </v-alert>

    <!-- Concept Sets Table -->
    <v-card>
      <v-data-table
        v-model:sort-by="sortBy"
        :headers="headers"
        :items="store.filteredSets"
        :loading="store.loading"
        :items-per-page="itemsPerPage"
        :items-per-page-text="t('datatable.itemsPerPage', 'Rows per page:').value"
        class="elevation-1"
      >
        <!-- Name -->
        <template #item.name="{ item }">
          {{ item.name }}
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

        <!-- Actions Column -->
        <template #item.actions="{ item }">
          <div class="d-flex justify-center">
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              @click="onEditClick(item.id)"
            />
          </div>
        </template>

        <!-- No data message -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon
              size="64"
              color="grey-lighten-1"
            >
              mdi-folder-open
            </v-icon>
            <p class="text-body-1 mt-4 text-grey">
              {{ store.loading ? t('common.loadingWithDots', 'Loading...') : t('common.noData', 'No concept sets found') }}
            </p>
            <p
              v-if="!store.loading"
              class="text-caption text-grey"
            >
              {{ t('cs.manager.emptyStateMessage', 'Click "Add concept set" to create your first concept set') }}
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
    </v-card>

    <!-- Delete Confirmation Dialog -->
    <v-dialog
      v-model="deleteDialog"
      max-width="500"
    >
      <v-card>
        <v-card-title class="text-h6">
          {{ t('common.delete', 'Delete') }} {{ t('common.conceptSet', 'Concept Set') }}
        </v-card-title>
        
        <v-card-text>
          {{ t('reusables.manager.messages.deleteConfirmation', 'Are you sure you want to delete') }} "{{ deleteTarget?.name }}"?
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="deleteDialog = false"
          >
            {{ t('common.cancel', 'Cancel') }}
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="store.loading"
            @click="confirmDelete"
          >
            {{ t('common.delete', 'Delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Concept Set Editor (Side Panel) -->
    <ConceptSetEditor
      v-if="store.editorOpen"
      :model-value="store.editorOpen"
      :concept-set="store.currentSet"
      @update:model-value="(value) => { if (!value) store.closeEditor() }"
      @save="onSave"
      @delete="onDeleteClick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { formatDate } from '@/utils/date-format'
import type { ConceptSetListItem } from '@/models/concept-set.types'
import ConceptSetEditor from './ConceptSetEditor.vue'

const { t } = useI18n()

// ============================================================================
// Store
// ============================================================================

const store = useConceptSetsStore()

// ============================================================================
// Local State
// ============================================================================

const itemsPerPage = ref(25)
const deleteDialog = ref(false)
const deleteTarget = ref<ConceptSetListItem | null>(null)
const sortBy = ref([{ key: 'modifiedDate', order: 'desc' as const }])

// ============================================================================
// Table Configuration
// ============================================================================

const headers = [
  { title: t('columns.id', 'ID').value, key: 'id', sortable: true, width: '100px' },
  { title: t('columns.name', 'Name').value, key: 'name', sortable: true },
  { title: t('columns.created', 'Created').value, key: 'createdDate', sortable: true, width: '120px' },
  { title: t('columns.updated', 'Updated').value, key: 'modifiedDate', sortable: true, width: '120px' },
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

function getAuthorName(author: string | { id: number; name: string | null; login: string } | undefined): string {
  if (!author) return ''
  if (typeof author === 'string') return author
  return author.name || author.login || ''
}

function onFilterChange(value: string | null) {
  store.setFilter(value || '')
}

function onFilterClear() {
  store.setFilter('')
}

function onAddClick() {
  store.openCreateEditor()
}

function onEditClick(id: number | string | undefined) {
  if (id !== undefined) {
    store.openEditEditor(id)
  }
}

function onDeleteClick(id: number | string) {
  const item = store.filteredSets.find(s => s.id === id)
  deleteTarget.value = item || null
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return

  const success = await store.remove(deleteTarget.value.id)
  
  if (success) {
    deleteDialog.value = false
    deleteTarget.value = null
  }
}

async function onSave() {
  // Refresh the list after save
  await store.fetchAll()
}
</script>

<style scoped>
.concept-set-list {
  width: 100%;
}

.gap-2 {
  gap: 8px;
}

.gap-4 {
  gap: 16px;
}
</style>
