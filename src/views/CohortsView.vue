<template>
  <div class="page-wrapper">
    <div class="page-card">
      <v-container fluid class="cohorts-view">
        <v-row>
          <v-col cols="12">
            <div class="cohorts-view__actions">
          <v-btn
            color="primary"
            variant="flat"
            size="large"
            class="cohorts-view__action-btn"
            aria-label="Create new cohort"
            @click="handleCreateCohort"
          >
            Create Cohort
          </v-btn>

          <v-btn
            color="primary"
            variant="flat"
            size="large"
            class="cohorts-view__action-btn"
            aria-label="Import cohort from JSON"
            @click="handleImportCohort"
          >
            Import Cohort
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <cohort-grid
          :cohorts="paginatedCohorts"
          :loading="loading"
          :error="error"
          :search-query="searchQuery"
          @retry="fetchCohorts"
          @create-cohort="handleCreateCohort"
          @materialize="handleMaterialize"
          @delete="handleDeleteClick"
        />
      </v-col>
    </v-row>

    <!-- Import Dialog -->
    <v-dialog
      v-model="showImportDialog"
      max-width="600px"
    >
      <v-card>
        <v-card-title class="text-h5">
          Import Cohort
        </v-card-title>
        <v-card-text>
          <p class="mb-4">Import functionality will be implemented in a future update.</p>
          <p class="text-body-2 text-grey">
            This will allow you to import cohort definitions from ATLAS JSON format.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showImportDialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Materialize Dialog -->
    <v-dialog
      v-model="showMaterializeDialog"
      max-width="600px"
    >
      <v-card>
        <v-card-title class="text-h5">
          Materialize Cohort
        </v-card-title>
        <v-card-text>
          <p class="mb-2"><strong>Cohort:</strong> {{ selectedCohort?.name }}</p>
          <p class="mb-4"><strong>ID:</strong> {{ selectedCohort?.id }}</p>
          <p class="text-body-2 text-grey">
            Materialize functionality will be implemented in a future update. This will generate the patient list for this cohort definition.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showMaterializeDialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog
      v-model="showDeleteDialog"
      max-width="500px"
    >
      <v-card>
        <v-card-title class="text-h5">
          Delete Cohort?
        </v-card-title>
        <v-card-text>
          <p class="mb-2">Are you sure you want to delete this cohort?</p>
          <p class="mb-2"><strong>{{ selectedCohort?.name }}</strong></p>
          <p class="text-body-2 text-error">
            This action cannot be undone.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showDeleteDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            variant="elevated"
            :loading="deleting"
            @click="confirmDelete"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>

  <!-- Fixed pagination bar at bottom -->
  <div v-if="!loading && !error && filteredCohorts.length > 0" class="cohorts-view__pagination-bar">
    <div class="cohorts-view__pagination-content">
      <div class="cohorts-view__pagination-search">
        <label for="cohort-search" class="cohorts-view__pagination-label">Search:</label>
        <cohort-search
          id="cohort-search"
          v-model="searchQuery"
          class="cohorts-view__search-input"
        />
      </div>

      <cohort-pagination
        :page="page"
        :items-per-page="itemsPerPage"
        :items-per-page-options="itemsPerPageOptions"
        :total-items="totalItems"
        :can-go-previous="canGoPrevious"
        :can-go-next="canGoNext"
        :range-display="rangeDisplay"
        @previous="previousPage"
        @next="nextPage"
        @update:items-per-page="setItemsPerPage"
      />
    </div>
  </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCohorts } from '@/composables/useCohorts'
import { usePagination } from '@/composables/usePagination'
import { deleteCohort } from '@/services/webapi'
import CohortGrid from '@/components/cohort/CohortGrid.vue'
import CohortSearch from '@/components/cohort/CohortSearch.vue'
import CohortPagination from '@/components/cohort/CohortPagination.vue'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

const router = useRouter()
const showImportDialog = ref(false)
const showMaterializeDialog = ref(false)
const showDeleteDialog = ref(false)
const selectedCohort = ref<CohortDefinitionSummary | null>(null)
const deleting = ref(false)

// Cohorts state management
const {
  loading,
  error,
  searchQuery,
  filteredCohorts,
  fetchCohorts,
} = useCohorts()

// Pagination state management
const totalItems = computed(() => filteredCohorts.value.length)

const {
  page,
  itemsPerPage,
  itemsPerPageOptions,
  canGoPrevious,
  canGoNext,
  rangeDisplay,
  nextPage,
  previousPage,
  setItemsPerPage,
} = usePagination(totalItems)

/**
 * Paginated cohorts (current page slice)
 */
const paginatedCohorts = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredCohorts.value.slice(start, end)
})

/**
 * Navigate to create new cohort page
 */
function handleCreateCohort() {
  router.push('/cohorts/new')
}

/**
 * Open import cohort dialog
 */
function handleImportCohort() {
  showImportDialog.value = true
}

/**
 * Open materialize dialog
 */
function handleMaterialize(cohort: CohortDefinitionSummary) {
  selectedCohort.value = cohort
  showMaterializeDialog.value = true
}

/**
 * Open delete confirmation dialog
 */
function handleDeleteClick(cohort: CohortDefinitionSummary) {
  selectedCohort.value = cohort
  showDeleteDialog.value = true
}

/**
 * Confirm and execute cohort deletion
 */
async function confirmDelete() {
  if (!selectedCohort.value) return

  deleting.value = true

  try {
    await deleteCohort(selectedCohort.value.id)
    
    // Refresh cohort list
    await fetchCohorts()
    
    // Close dialog
    showDeleteDialog.value = false
    selectedCohort.value = null
  } catch (err) {
    console.error('Failed to delete cohort:', err)
    // Error handling could be enhanced with a snackbar notification
  } finally {
    deleting.value = false
  }
}

// Fetch cohorts on component mount
onMounted(() => {
  fetchCohorts()
})
</script>

<style scoped>
.page-wrapper {
  min-height: 100%;
  background-color: rgb(var(--v-theme-background));
  display: flex;
  padding: 32px;
  box-sizing: border-box;
}

.page-card {
  border-radius: 18px;
  padding: 30px;
  background-color: white;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.cohorts-view {
  padding: 0;
  padding-bottom: 80px; /* Space for fixed pagination */
}

/* Breadcrumb */
.cohorts-view__breadcrumb {
  padding: 16px 24px;
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  text-align: center;
}

.cohorts-view__breadcrumb-item {
  font-size: 1rem;
  color: #666;
}

.cohorts-view__breadcrumb-item--active {
  font-weight: 500;
  color: #333;
}

/* Actions */
.cohorts-view__actions {
  display: flex;
  gap: 16px;
  padding: 20px 24px;
}

.cohorts-view__action-btn {
  flex: 1;
  text-transform: none;
  font-weight: 400;
  letter-spacing: normal;
}

/* Pagination Bar */
.cohorts-view__pagination-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  border-top: 1px solid #e0e0e0;
  padding: 12px 24px;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.cohorts-view__pagination-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  max-width: 100%;
}

.cohorts-view__pagination-search {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cohorts-view__pagination-label {
  font-size: 0.875rem;
  color: #666;
  white-space: nowrap;
}

.cohorts-view__search-input {
  width: 200px;
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .cohorts-view__pagination-content {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .cohorts-view__pagination-search {
    justify-content: flex-start;
  }

  .cohorts-view__search-input {
    flex: 1;
  }
}

@media (max-width: 599px) {
  .cohorts-view__actions {
    flex-direction: column;
  }
}
</style>
