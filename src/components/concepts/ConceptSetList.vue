<template>
  <div class="concept-set-list">
    <!-- Header with Search and Add Button -->
    <v-card flat class="mb-4">
      <v-card-text>
        <div class="d-flex align-center justify-space-between gap-4">
          <v-text-field
            :model-value="store.filterTerm"
            placeholder="Search"
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
            Add concept set
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
        :headers="headers"
        :items="store.filteredSets"
        :loading="store.loading"
        :items-per-page="itemsPerPage"
        items-per-page-text="Rows per page:"
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
            <v-icon size="64" color="grey-lighten-1">mdi-folder-open</v-icon>
            <p class="text-body-1 mt-4 text-grey">
              {{ store.loading ? 'Loading...' : 'No concept sets found' }}
            </p>
            <p class="text-caption text-grey" v-if="!store.loading">
              Click "Add concept set" to create your first concept set
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
    <v-dialog v-model="deleteDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h6">
          Delete Concept Set
        </v-card-title>
        
        <v-card-text>
          Are you sure you want to delete "{{ deleteTarget?.name }}"? This action cannot be undone.
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="deleteDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="store.loading"
            @click="confirmDelete"
          >
            Delete
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
import { useConceptSetsStore } from '@/stores/concept-sets'
import { formatDate } from '@/utils/date-format'
import type { ConceptSetListItem } from '@/models/concept-set.types'
import ConceptSetEditor from './ConceptSetEditor.vue'

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

// ============================================================================
// Table Configuration
// ============================================================================

const headers = [
  { title: 'ID', key: 'id', sortable: true, width: '100px' },
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Created', key: 'createdDate', sortable: true, width: '120px' },
  { title: 'Updated', key: 'modifiedDate', sortable: true, width: '120px' },
  { title: 'Author', key: 'createdBy', sortable: true, width: '150px' },
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
