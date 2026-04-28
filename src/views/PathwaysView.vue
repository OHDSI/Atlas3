<template>
  <AnalysisListLayout
    :error="error?.message ?? null"
    :show-view-toggle="true"
    :view-mode="viewMode"
    testid="pathways"
    @update:view-mode="(v) => viewMode = v"
  >
    <template #actions>
      <v-btn
        color="primary"
        variant="flat"
        size="large"
        prepend-icon="mdi-plus"
        data-testid="pathways-create"
        @click="handleNew"
      >
        {{ t('cohortDefinitions.newDefinition', 'New pathway') }}
      </v-btn>
    </template>

    <template #filters>
      <PathwayFilters
        :model-value="filters"
        :all-tags="allTags"
        @update:model-value="updateFilters"
        @clear="clearFilters"
      />
    </template>

    <div
      v-if="loading"
      class="pathways-view__state"
    >
      {{ t('common.loading', 'Loading…') }}
    </div>
    <div
      v-else-if="pathways.length === 0"
      class="pathways-view__state"
    >
      {{ t('common.noData', 'No pathways yet.') }}
    </div>
    <template v-else>
      <div
        v-if="viewMode === 'tile'"
        class="pathways-view__grid"
      >
        <PathwayCard
          v-for="p in paginatedPathways"
          :key="p.id"
          :pathway="p"
          @open="handleOpen"
          @remove="handleRemove"
        />
      </div>
      <PathwayTable
        v-else
        :pathways="paginatedPathways"
        @open="handleOpen"
        @remove="handleRemove"
      />
    </template>

    <template
      v-if="!loading && pathways.length > 0"
      #pagination
    >
      <PathwayPagination
        :page="page"
        :total-pages="totalPages"
        :items-per-page="itemsPerPage"
        @update:page="updatePage"
        @update:items-per-page="updateItemsPerPage"
      />
    </template>
  </AnalysisListLayout>

  <v-dialog
    v-model="showDelete"
    max-width="400"
  >
    <v-card>
      <v-card-title>{{ t('common.delete', 'Delete pathway') }}</v-card-title>
      <v-card-text>{{ t('pathwayDefinitions.deleteConfirm', 'Delete this pathway? This cannot be undone.') }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="showDelete = false">
          {{ t('common.cancel', 'Cancel') }}
        </v-btn>
        <v-btn
          color="error"
          @click="confirmDelete"
        >
          {{ t('common.delete', 'Delete pathway') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar
    :model-value="!!feedback"
    :color="feedback?.color ?? 'info'"
    :timeout="3000"
    @update:model-value="(open: boolean) => { if (!open) feedback = null }"
  >
    {{ feedback?.message }}
  </v-snackbar>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePathways } from '@/composables/usePathways'
import { useI18n } from '@/composables/useI18n'
import type { PathwayFilters as PathwayFiltersType } from '@/composables/usePathways'
import { usePathwayStore } from '@/stores/pathway'
import { deletePathway } from '@/services/webapi'
import PathwayCard from '@/components/pathway/PathwayCard.vue'
import PathwayTable from '@/components/pathway/PathwayTable.vue'
import PathwayFilters from '@/components/pathway/PathwayFilters.vue'
import PathwayPagination from '@/components/pathway/PathwayPagination.vue'
import AnalysisListLayout from '@/components/analysis/AnalysisListLayout.vue'

const {
  pathways, loading, error,
  filters, page, itemsPerPage,
  fetchPathways, clearFilters,
  paginatedPathways, totalPages,
} = usePathways()

const router = useRouter()
const store = usePathwayStore()
const { t } = useI18n()
const viewMode = ref<'tile' | 'table'>('tile')
const showDelete = ref(false)
const deleteTarget = ref<number | null>(null)
const feedback = ref<{ message: string; color: 'success' | 'error' | 'info' } | null>(null)

const allTags = computed(() => {
  const set = new Set<string>()
  pathways.value.forEach(p => p.tags?.forEach(t => set.add(t.name)))
  return [...set].sort()
})

onMounted(fetchPathways)

function updateFilters(v: PathwayFiltersType) {
  filters.value = v
}

function updatePage(n: number) {
  page.value = n
}

function updateItemsPerPage(n: number) {
  itemsPerPage.value = n
}

function handleNew() {
  store.createNewPathway()
  router.push('/pathways/new')
}

function handleOpen(id: number) {
  if (id) router.push(`/pathways/${id}`)
}

function handleRemove(id: number) {
  deleteTarget.value = id
  showDelete.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const ok = await deletePathway(deleteTarget.value)
  if (ok) {
    feedback.value = { message: 'Pathway deleted', color: 'success' }
    await fetchPathways()
  } else {
    feedback.value = { message: 'Delete failed', color: 'error' }
  }
  showDelete.value = false
  deleteTarget.value = null
}
</script>

<style scoped>
.pathways-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.pathways-view__state {
  padding: 32px;
  text-align: center;
  color: #666;
}
</style>
