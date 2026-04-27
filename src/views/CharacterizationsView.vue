<template>
  <AnalysisListLayout
    :error="error ?? null"
    testid="characterizations"
    @clear-error="store.clearError()"
  >
    <template #actions>
      <v-btn
        color="primary"
        variant="flat"
        size="large"
        prepend-icon="mdi-plus"
        :aria-label="t('characterizations.list.newButton', 'New Characterization').value"
        data-testid="characterizations-create"
        @click="handleCreate"
      >
        {{ t('characterizations.list.newButton', 'New Characterization') }}
      </v-btn>
    </template>

    <template #filters>
      <v-text-field
        :model-value="searchInput"
        :label="t('characterizations.list.searchPlaceholder', 'Search characterizations...').value"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        class="characterizations-view__search"
        data-testid="characterizations-search"
        @update:model-value="handleSearchInput"
      />
    </template>

    <v-data-table
      :headers="headers"
      :items="paginatedCharacterizations"
      :loading="loading"
      :items-per-page="itemsPerPage"
      hide-default-footer
      density="comfortable"
      data-testid="characterizations-table"
    >
      <template #[`item.name`]="{ item }">
        <a
          href="#"
          class="characterizations-view__name-link"
          data-testid="characterizations-row-name"
          @click.prevent="openEditor(item.id)"
        >
          {{ item.name }}
        </a>
      </template>

      <template #[`item.description`]="{ item }">
        {{ truncate(item.description) }}
      </template>

      <template #[`item.cohorts`]="{ item }">
        {{ item.cohorts?.length ?? 0 }}
      </template>

      <template #[`item.featureAnalyses`]="{ item }">
        {{ item.featureAnalyses?.length ?? 0 }}
      </template>

      <template #[`item.createdBy`]="{ item }">
        {{ formatUser(item.createdBy) }}
      </template>

      <template #[`item.createdDate`]="{ item }">
        {{ formatDate(item.createdDate) }}
      </template>

      <template #[`item.modifiedDate`]="{ item }">
        {{ formatDate(item.modifiedDate) }}
      </template>

      <template #[`item.actions`]="{ item }">
        <v-btn
          icon="mdi-pencil"
          size="small"
          variant="text"
          :aria-label="t('characterizations.list.actions.edit', 'Edit').value"
          @click="openEditor(item.id)"
        />
        <v-btn
          icon="mdi-content-copy"
          size="small"
          variant="text"
          :aria-label="t('characterizations.list.actions.copy', 'Copy').value"
          @click="handleCopy(item)"
        />
        <v-btn
          icon="mdi-delete"
          size="small"
          variant="text"
          color="error"
          :aria-label="t('characterizations.list.actions.delete', 'Delete').value"
          @click="handleDeleteClick(item)"
        />
      </template>

      <template #no-data>
        <div
          class="characterizations-view__empty"
          data-testid="characterizations-empty"
        >
          {{ t('characterizations.list.empty', 'No characterizations found.') }}
        </div>
      </template>
    </v-data-table>

    <template
      v-if="!loading && totalItems > itemsPerPage"
      #pagination
    >
      <v-btn
        variant="text"
        :disabled="!canGoPrevious"
        @click="previousPage"
      >
        {{ t('common.previous', 'Previous') }}
      </v-btn>
      <span class="characterizations-view__range">{{ rangeDisplay }}</span>
      <v-btn
        variant="text"
        :disabled="!canGoNext"
        @click="nextPage"
      >
        {{ t('common.next', 'Next') }}
      </v-btn>
    </template>
  </AnalysisListLayout>

  <!-- Delete confirmation dialog -->
  <v-dialog
    v-model="showDeleteDialog"
    max-width="500"
  >
    <v-card>
      <v-card-title class="text-h5">
        {{ t('common.delete', 'Delete') }}
      </v-card-title>
      <v-card-text v-if="selectedCC">
        {{ deleteMessage }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="showDeleteDialog = false"
        >
          {{ t('common.cancel', 'Cancel') }}
        </v-btn>
        <v-btn
          color="error"
          variant="elevated"
          :loading="deleting"
          @click="confirmDelete"
        >
          {{ t('common.delete', 'Delete') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useI18n } from '@/composables/useI18n'
import { useCharacterizations } from '@/composables/useCharacterizations'
import { useCharacterizationStore } from '@/stores/characterization'
import { formatDate } from '@/utils/date-format'
import { logger } from '@/utils/logger'
import type { CharacterizationListItem } from '@/models/characterization.types'
import AnalysisListLayout from '@/components/analysis/AnalysisListLayout.vue'

const router = useRouter()
const { t } = useI18n()
const store = useCharacterizationStore()

const {
  loading,
  error,
  paginatedCharacterizations,
  totalItems,
  itemsPerPage,
  canGoPrevious,
  canGoNext,
  rangeDisplay,
  nextPage,
  previousPage,
  setFilter,
  refresh,
} = useCharacterizations()

// Local search input state — debounce is handled in the store via setFilter.
const searchInput = ref<string>('')

const headers = computed(() => [
  { title: t('characterizations.list.columns.name', 'Name').value, key: 'name' },
  { title: t('characterizations.list.columns.description', 'Description').value, key: 'description' },
  { title: t('characterizations.list.columns.cohorts', 'Cohorts').value, key: 'cohorts' },
  { title: t('characterizations.list.columns.featureAnalyses', 'Feature Analyses').value, key: 'featureAnalyses' },
  { title: t('characterizations.list.columns.createdBy', 'Created By').value, key: 'createdBy' },
  { title: t('characterizations.list.columns.createdDate', 'Created').value, key: 'createdDate' },
  { title: t('characterizations.list.columns.modifiedDate', 'Modified').value, key: 'modifiedDate' },
  { title: t('characterizations.list.columns.actions', 'Actions').value, key: 'actions', sortable: false },
])

const showDeleteDialog = ref(false)
const selectedCC = ref<CharacterizationListItem | null>(null)
const deleting = ref(false)

const deleteMessage = computed(() => {
  if (!selectedCC.value) return ''
  return t(
    'characterizations.list.deleteConfirm',
    `Delete characterization '${selectedCC.value.name}'?`,
    { name: selectedCC.value.name }
  ).value
})

function handleSearchInput(value: string | null) {
  const next = value ?? ''
  searchInput.value = next
  setFilter(next)
}

function handleCreate() {
  router.push('/characterizations/new')
}

function openEditor(id: number) {
  router.push(`/characterizations/${id}`)
}

async function handleCopy(item: CharacterizationListItem) {
  const copied = await store.copy(item.id)
  if (copied?.id) {
    router.push(`/characterizations/${copied.id}`)
  }
}

function handleDeleteClick(item: CharacterizationListItem) {
  selectedCC.value = item
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!selectedCC.value) return
  deleting.value = true
  try {
    const success = await store.remove(selectedCC.value.id)
    if (success) {
      showDeleteDialog.value = false
      selectedCC.value = null
    }
  } catch (err) {
    logger.error('CharacterizationsView', 'Failed to delete characterization', err)
  } finally {
    deleting.value = false
  }
}

function formatUser(user: CharacterizationListItem['createdBy']): string {
  if (!user) return '—'
  if (typeof user === 'string') return user
  return user.name ?? user.login ?? '—'
}

const DESCRIPTION_TRUNCATE_LIMIT = 80
function truncate(value: string | undefined): string {
  if (!value) return '—'
  if (value.length <= DESCRIPTION_TRUNCATE_LIMIT) return value
  return `${value.slice(0, DESCRIPTION_TRUNCATE_LIMIT)}…`
}

onMounted(() => {
  refresh()
})
</script>

<style scoped>
.characterizations-view__search {
  max-width: 480px;
}

.characterizations-view__name-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  font-weight: 500;
}

.characterizations-view__name-link:hover {
  text-decoration: underline;
}

.characterizations-view__empty {
  padding: 32px;
  text-align: center;
  color: #666;
}

.characterizations-view__range {
  font-size: 0.875rem;
  color: #666;
  padding: 0 12px;
}
</style>
