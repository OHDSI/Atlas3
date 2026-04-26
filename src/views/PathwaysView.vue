<template>
  <v-container>
    <div class="header">
      <v-btn
        color="primary"
        @click="handleNew"
      >
        {{ t('pathwayDefinitions.newDefinition', 'New pathway') }}
      </v-btn>
      <v-spacer />
      <v-btn-toggle
        :model-value="viewMode"
        @update:model-value="(v: 'tile' | 'table' | null) => v && (viewMode = v)"
      >
        <v-btn
          value="tile"
          icon="mdi-view-grid"
        />
        <v-btn
          value="table"
          icon="mdi-view-list"
        />
      </v-btn-toggle>
    </div>

    <PathwayFilters
      :model-value="filters"
      :all-tags="allTags"
      @update:model-value="updateFilters"
      @clear="clearFilters"
    />

    <div
      v-if="loading"
      class="state"
    >
      {{ t('pathway.list.loading', 'Loading…') }}
    </div>
    <div
      v-else-if="error"
      class="state error"
    >
      {{ error.message }}
    </div>
    <div
      v-else-if="pathways.length === 0"
      class="state"
    >
      {{ t('pathway.list.empty', 'No pathways yet.') }}
    </div>
    <template v-else>
      <div
        v-if="viewMode === 'tile'"
        class="grid"
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
      <PathwayPagination
        :page="page"
        :total-pages="totalPages"
        :items-per-page="itemsPerPage"
        @update:page="updatePage"
        @update:items-per-page="updateItemsPerPage"
      />
    </template>

    <v-dialog
      v-model="showDelete"
      max-width="400"
    >
      <v-card>
        <v-card-title>{{ t('pathwayDefinitions.delete', 'Delete pathway') }}</v-card-title>
        <v-card-text>{{ t('pathwayDefinitions.deleteConfirm', 'Delete this pathway? This cannot be undone.') }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDelete = false">
            {{ t('pathwayDefinitions.cancel', 'Cancel') }}
          </v-btn>
          <v-btn
            color="error"
            @click="confirmDelete"
          >
            {{ t('pathwayDefinitions.delete', 'Delete pathway') }}
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
  </v-container>
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
.header { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  margin: 16px 0;
}
.state { padding: 24px; text-align: center; color: #888; }
.state.error { color: #c00; }
</style>
