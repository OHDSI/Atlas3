<template>
  <AtlasPageShell
    hero
    compact
    :eyebrow="t('reusables.list.eyebrow').value"
    :title="t('navigation.reusables').value"
    :subtitle="t('reusables.list.subtitle').value"
  >
    <AnalysisListLayout
      :error="error"
      testid="reusables"
      @clear-error="error = null"
    >
      <template #actions>
        <AtlasFacetFilterBar
          :facet-options="facetOptions"
          :selected="selectedFacets"
          :active-filter-count="activeFilterCount"
          :facets="facets"
          :result-filter="textFilter"
          class="reusables-view__search"
          text-field-test-id="reusables-search"
          @update:facet="(payload: { key: string; values: string[] }) => setFacet(payload.key, payload.values)"
          @update:result-filter="setTextFilter"
          @clear="clearFilters"
        />
      </template>

      <template #primary-action>
        <AtlasButton
          icon="mdi-plus"
          :disabled="!canCreate"
          data-testid="reusables-create"
          @click="router.push('/reusables/new')"
        >
          {{ t('reusables.list.newButton') }}
        </AtlasButton>
      </template>

      <AnalysisDataTable
        v-model:sort-by="sortBy"
        :headers="headers"
        :items="pagedReusables"
        :loading="loading"
        :items-per-page="itemsPerPage"
        :empty-text="t('reusables.list.empty').value"
        testid="reusables-table"
        :can-copy-item="item => canCreate && !!item.id"
        :can-delete-item="item => entityAccess.canDelete(item.id)"
        @open="item => router.push(`/reusables/${item.id}`)"
        @copy="handleCopy"
        @delete="item => (pendingDelete = item)"
      >
        <template #[`item.type`]="{ item }">
          <AtlasChip
            size="sm"
            variant="tonal"
          >
            {{ t(`reusables.types.${item.type}`) }}
          </AtlasChip>
        </template>
      </AnalysisDataTable>

      <template
        v-if="!loading && filteredReusables.length > itemsPerPage"
        #pagination
      >
        <AtlasButton
          variant="ghost"
          :disabled="page <= 1"
          @click="page--"
        >
          {{ t('datatable.language.paginate.previous') }}
        </AtlasButton>
        <span class="reusables-view__range">{{ rangeDisplay }}</span>
        <AtlasButton
          variant="ghost"
          :disabled="page * itemsPerPage >= filteredReusables.length"
          @click="page++"
        >
          {{ t('configuration.userImport.wizard.buttons.next') }}
        </AtlasButton>
      </template>
    </AnalysisListLayout>
  </AtlasPageShell>

  <AtlasDialog
    :model-value="!!pendingDelete"
    eyebrow="CONFIRM"
    :title="t('common.delete').value"
    max-width="480"
    @update:model-value="open => !open && (pendingDelete = null)"
    @close="pendingDelete = null"
  >
    {{ t('reusables.deleteConfirm', { name: pendingDelete?.name ?? '' }) }}
    <template #actions>
      <AtlasButton
        variant="ghost"
        @click="pendingDelete = null"
      >
        {{ t('common.cancel') }}
      </AtlasButton>
      <AtlasButton
        variant="danger"
        :loading="deleting"
        data-testid="reusables-delete-confirm"
        @click="confirmDelete"
      >
        {{ t('common.delete') }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AtlasButton, AtlasChip, AtlasDialog, AtlasFacetFilterBar, AtlasPageShell } from '@/components/ui'
import AnalysisListLayout from '@/components/analysis/AnalysisListLayout.vue'
import AnalysisDataTable from '@/components/analysis/AnalysisDataTable.vue'
import { useI18n } from '@/composables/useI18n'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccessFor } from '@/composables/useEntityAccess'
import { useConceptFacets, type FacetDefinition } from '@/composables/useConceptFacets'
import {
  DESIGNS_MINE,
  DESIGNS_OTHER,
  recencyBucket,
} from '@/composables/useFeatureAnalysisFacets'
import { useAuthStore } from '@/stores/auth'
import { useNotifications } from '@/stores/notifications'
import { copyReusable, deleteReusable, listReusables } from '@/services/reusable.service'
import { parseReusableDesign } from '@/components/reusables/reusable-design'
import { reusableAuthorLogin } from '@/components/reusables/reusable-display'
import type { Reusable, ReusableType } from '@/models/reusable.types'

type ReusableRow = Reusable & { id: number; type: ReusableType }
type SortItem = { key: string; order: 'asc' | 'desc' }

const router = useRouter()
const { t, tv } = useI18n()
const notify = useNotifications()
const authStore = useAuthStore()
const { hasPermission } = usePermissions()
const entityAccess = useEntityAccessFor('reusable')
const canCreate = computed(() => hasPermission('create:reusable'))

const reusables = ref<ReusableRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const itemsPerPage = 25
const sortBy = ref<SortItem[]>([{ key: 'modifiedDate', order: 'desc' }])
const pendingDelete = ref<ReusableRow | null>(null)
const deleting = ref(false)
const facetNow = ref(Date.now())

function timestamp(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined
  const time = typeof value === 'number' ? value : Date.parse(value)
  return Number.isNaN(time) ? undefined : time
}

const facets = computed<FacetDefinition<ReusableRow>[]>(() => [
  { key: 'type', label: 'Type', display: r => tv(`reusables.types.${r.type}`) },
  { key: 'created', label: 'Created', display: r => recencyBucket(timestamp(r.createdDate), facetNow.value) },
  {
    key: 'updated',
    label: 'Updated',
    display: r => recencyBucket(timestamp(r.modifiedDate ?? r.createdDate), facetNow.value),
  },
  { key: 'author', label: 'Author', display: r => reusableAuthorLogin(r.createdBy) ?? 'anonymous' },
  {
    key: 'designs',
    label: 'Designs',
    display: r =>
      authStore.user?.login && reusableAuthorLogin(r.createdBy) === authStore.user.login
        ? DESIGNS_MINE
        : DESIGNS_OTHER,
  },
])

const {
  selected: selectedFacets,
  textFilter,
  facetOptions,
  filteredConcepts: filteredReusables,
  activeFilterCount,
  setFacet,
  setTextFilter,
  clearFilters,
} = useConceptFacets(reusables, facets, r => [r.name, r.description ?? '', String(r.id)].join(' '))

watch(filteredReusables, () => {
  page.value = 1
})

function sortValue(row: ReusableRow, key: string): string | number {
  if (key === 'createdBy') return (reusableAuthorLogin(row.createdBy) ?? '').toLowerCase()
  if (key === 'createdDate' || key === 'modifiedDate') return timestamp(row[key]) ?? 0
  const value = row[key as keyof ReusableRow]
  if (typeof value === 'string') return value.toLowerCase()
  return typeof value === 'number' ? value : ''
}

const sortedReusables = computed(() => {
  const active = sortBy.value[0]
  if (!active) return filteredReusables.value
  const direction = active.order === 'asc' ? 1 : -1
  return [...filteredReusables.value].sort((a, b) => {
    const left = sortValue(a, active.key)
    const right = sortValue(b, active.key)
    if (left === right) return 0
    return left > right ? direction : -direction
  })
})

const pagedReusables = computed(() => {
  const start = (page.value - 1) * itemsPerPage
  return sortedReusables.value.slice(start, start + itemsPerPage)
})

const rangeDisplay = computed(() => {
  const total = filteredReusables.value.length
  const start = (page.value - 1) * itemsPerPage + 1
  const end = Math.min(page.value * itemsPerPage, total)
  return `${start}-${end} of ${total}`
})

const headers = computed(() => [
  { title: t('columns.id').value, key: 'id' },
  { title: t('columns.name').value, key: 'name' },
  { title: t('columns.type').value, key: 'type' },
  { title: t('common.tags').value, key: 'tags', sortable: false },
  { title: t('columns.createdBy').value, key: 'createdBy' },
  { title: t('columns.created').value, key: 'createdDate' },
  { title: t('columns.updated').value, key: 'modifiedDate' },
  { title: t('columns.actions').value, key: 'actions', sortable: false },
])

async function load() {
  loading.value = true
  error.value = null
  facetNow.value = Date.now()
  const result = await listReusables()
  loading.value = false
  if (!result.success) {
    error.value = result.error.message
    return
  }
  reusables.value = result.data
    .filter((r): r is Reusable & { id: number } => typeof r.id === 'number')
    .map(r => ({ ...r, type: parseReusableDesign(r.data).type }))
}

async function handleCopy(row: ReusableRow) {
  const result = await copyReusable(row.id)
  if (!result.success || !result.data.id) {
    notify.danger(tv('reusables.copyError'))
    return
  }
  await router.push(`/reusables/${result.data.id}`)
}

async function confirmDelete() {
  const row = pendingDelete.value
  if (!row) return
  deleting.value = true
  const result = await deleteReusable(row.id)
  deleting.value = false
  pendingDelete.value = null
  if (!result.success) {
    notify.danger(tv('reusables.deleteError'))
    return
  }
  reusables.value = reusables.value.filter(r => r.id !== row.id)
}

onMounted(load)
</script>

<style scoped>
.reusables-view__search {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 640px;
}

.reusables-view__range {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding: 0 12px;
}
</style>
