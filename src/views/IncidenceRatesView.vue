<template>
  <v-container>
    <div class="header">
      <v-btn
        color="primary"
        @click="handleNew"
      >
        {{ t('incidenceRateAnalysis.newAnalysis', 'New incidence rate') }}
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

    <IncidenceRateFilters
      :model-value="filters"
      :all-tags="allTags"
      @update:model-value="updateFilters"
      @clear="clearFilters"
    />

    <div
      v-if="loading"
      class="state"
    >
      {{ t('incidenceRate.list.loading', 'Loading…') }}
    </div>
    <div
      v-else-if="error"
      class="state error"
    >
      {{ error.message }}
    </div>
    <div
      v-else-if="incidenceRates.length === 0"
      class="state"
    >
      {{ t('incidenceRate.list.empty', 'No incidence rates yet.') }}
    </div>
    <template v-else>
      <div
        v-if="viewMode === 'tile'"
        class="grid"
      >
        <IncidenceRateCard
          v-for="ir in paginatedIncidenceRates"
          :key="ir.id"
          :incidence-rate="ir"
          @open="handleOpen"
          @remove="handleRemove"
        />
      </div>
      <IncidenceRateTable
        v-else
        :incidence-rates="paginatedIncidenceRates"
        @open="handleOpen"
        @remove="handleRemove"
      />
      <IncidenceRatePagination
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
        <v-card-title>{{ t('incidenceRateAnalysis.delete', 'Delete incidence rate') }}</v-card-title>
        <v-card-text>{{ t('incidenceRateAnalysis.deleteConfirmation', 'Delete incidence rate analysis? Warning: deletion can not be undone!') }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDelete = false">
            {{ t('common.cancel', 'Cancel') }}
          </v-btn>
          <v-btn
            color="error"
            @click="confirmDelete"
          >
            {{ t('common.delete', 'Delete') }}
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
import { useIncidenceRates } from '@/composables/useIncidenceRates'
import { useI18n } from '@/composables/useI18n'
import type { IncidenceRateListFilters } from '@/composables/useIncidenceRates'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { deleteIncidenceRate } from '@/services/webapi'
import IncidenceRateCard from '@/components/incidence-rate/IncidenceRateCard.vue'
import IncidenceRateTable from '@/components/incidence-rate/IncidenceRateTable.vue'
import IncidenceRateFilters from '@/components/incidence-rate/IncidenceRateFilters.vue'
import IncidenceRatePagination from '@/components/incidence-rate/IncidenceRatePagination.vue'

const {
  incidenceRates, loading, error,
  filters, page, itemsPerPage,
  fetchIncidenceRates, clearFilters,
  paginatedIncidenceRates, totalPages,
} = useIncidenceRates()

const router = useRouter()
const store = useIncidenceRateStore()
const { t } = useI18n()
const viewMode = ref<'tile' | 'table'>('tile')
const showDelete = ref(false)
const deleteTarget = ref<number | null>(null)
const feedback = ref<{ message: string; color: 'success' | 'error' | 'info' } | null>(null)

const allTags = computed(() => {
  const set = new Set<string>()
  incidenceRates.value.forEach(ir => ir.tags?.forEach(t => set.add(t.name)))
  return [...set].sort()
})

onMounted(fetchIncidenceRates)

function updateFilters(v: IncidenceRateListFilters) { filters.value = v }
function updatePage(n: number) { page.value = n }
function updateItemsPerPage(n: number) { itemsPerPage.value = n }

function handleNew() {
  store.createNewIR()
  router.push('/incidence-rates/new')
}
function handleOpen(id: number) { if (id) router.push(`/incidence-rates/${id}`) }
function handleRemove(id: number) { deleteTarget.value = id; showDelete.value = true }

async function confirmDelete() {
  if (!deleteTarget.value) return
  const ok = await deleteIncidenceRate(deleteTarget.value)
  if (ok) {
    feedback.value = { message: 'Incidence rate deleted', color: 'success' }
    await fetchIncidenceRates()
  } else {
    feedback.value = { message: 'Delete failed', color: 'error' }
  }
  showDelete.value = false
  deleteTarget.value = null
}
</script>

<style scoped>
.header { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; margin: 16px 0; }
.state { padding: 24px; text-align: center; color: #888; }
.state.error { color: #c00; }
</style>
