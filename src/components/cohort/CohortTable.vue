<template>
  <div class="cohort-table">
    <!-- Loading -->
    <div
      v-if="loading"
      class="cohort-table__loading"
    >
      <AtlasSkeleton type="table" />
    </div>

    <!-- Error -->
    <AtlasAlert
      v-else-if="error"
      severity="danger"
      :closable="true"
      class="cohort-table__alert"
    >
      <div class="cohort-table__error">
        <div>
          {{ error.message || t('common.errorLoadingCohorts', 'Failed to load cohorts').value }}
        </div>
        <AtlasButton
          variant="danger"
          class="mt-3"
          @click="$emit('retry')"
        >
          <AtlasIcon start>
            mdi-refresh
          </AtlasIcon>
          {{ t('common.refresh', 'Retry').value }}
        </AtlasButton>
      </div>
    </AtlasAlert>

    <!-- Empty: branch between "filtered → no matches" and "no
         cohorts at all" so the CTA actually helps. -->
    <div
      v-else-if="cohorts.length === 0"
      class="cohort-table__empty"
    >
      <AtlasIcon
        :icon="isFiltered ? 'mdi-filter-off-outline' : 'mdi-bookmark-outline'"
        size="36"
        class="cohort-table__empty-icon"
      />
      <p class="cohort-table__empty-text">
        {{ emptyMessage }}
      </p>
      <AtlasButton
        v-if="isFiltered"
        size="sm"
        variant="secondary"
        icon="mdi-close"
        @click="$emit('clear-filters')"
      >
        {{ t('search.clearAllSelections', 'Clear filters').value }}
      </AtlasButton>
      <AtlasButton
        v-else
        icon="mdi-plus"
        @click="$emit('create-cohort')"
      >
        {{ t('cohortDefinitions.newDefinition', 'New cohort').value }}
      </AtlasButton>
    </div>

    <!-- Table -->
    <AtlasCard
      v-else
      padding="none"
    >
      <v-table
        density="comfortable"
        hover
        class="cohort-table__grid"
        data-testid="cohort-table"
      >
        <thead>
          <tr>
            <th
              class="cohort-table__col-id"
              :aria-sort="ariaSort('id')"
            >
              <button
                type="button"
                class="cohort-table__sort"
                data-testid="cohort-table-sort-id"
                @click="toggleSort('id')"
              >
                {{ t('columns.id', 'ID').value }}
                <AtlasIcon
                  v-if="activeSortKey === 'id'"
                  :icon="sortIcon"
                  size="xs"
                />
              </button>
            </th>
            <th
              class="cohort-table__col-name"
              :aria-sort="ariaSort('name')"
            >
              <button
                type="button"
                class="cohort-table__sort"
                data-testid="cohort-table-sort-name"
                @click="toggleSort('name')"
              >
                {{ t('columns.name', 'Name').value }}
                <AtlasIcon
                  v-if="activeSortKey === 'name'"
                  :icon="sortIcon"
                  size="xs"
                />
              </button>
            </th>
            <th class="cohort-table__col-tags">
              {{ t('common.tags', 'Tags').value }}
            </th>
            <th
              class="cohort-table__col-author"
              :aria-sort="ariaSort('createdBy')"
            >
              <button
                type="button"
                class="cohort-table__sort"
                data-testid="cohort-table-sort-author"
                @click="toggleSort('createdBy')"
              >
                {{ t('columns.author', 'Author').value }}
                <AtlasIcon
                  v-if="activeSortKey === 'createdBy'"
                  :icon="sortIcon"
                  size="xs"
                />
              </button>
            </th>
            <th
              class="cohort-table__col-date"
              :aria-sort="ariaSort('createdDate')"
            >
              <button
                type="button"
                class="cohort-table__sort"
                data-testid="cohort-table-sort-created"
                @click="toggleSort('createdDate')"
              >
                {{ t('columns.created', 'Created').value }}
                <AtlasIcon
                  v-if="activeSortKey === 'createdDate'"
                  :icon="sortIcon"
                  size="xs"
                />
              </button>
            </th>
            <th
              class="cohort-table__col-date"
              :aria-sort="ariaSort('modifiedDate')"
            >
              <button
                type="button"
                class="cohort-table__sort"
                data-testid="cohort-table-sort-modified"
                @click="toggleSort('modifiedDate')"
              >
                {{ t('columns.updated', 'Updated').value }}
                <AtlasIcon
                  v-if="activeSortKey === 'modifiedDate'"
                  :icon="sortIcon"
                  size="xs"
                />
              </button>
            </th>
            <th class="cohort-table__col-actions" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="cohort in displayedCohorts"
            :key="cohort.id"
            class="cohort-table__row"
            data-testid="cohort-table-row"
            @click="openCohort(cohort)"
          >
            <td class="cohort-table__col-id">
              {{ cohort.id }}
            </td>
            <td class="cohort-table__col-name">
              <div class="cohort-table__name">
                {{ cohort.name }}
              </div>
              <div
                v-if="cohort.description"
                class="cohort-table__description"
                :title="cohort.description"
              >
                {{ cohort.description }}
              </div>
            </td>
            <td class="cohort-table__col-tags">
              <div
                v-if="cohort.tags && cohort.tags.length > 0"
                class="cohort-table__tags"
              >
                <AtlasChip
                  v-for="tag in cohort.tags"
                  :key="tag.id || tag.name"
                  size="sm"
                  variant="flat"
                  :style="{
                    backgroundColor: tagColor(tag.color),
                    color: tagContrastColor(tag.color),
                    boxShadow: (selectedTags ?? []).includes(tag.name)
                      ? `0 0 0 2px rgb(var(--v-theme-primary))`
                      : undefined,
                  }"
                  @click.stop="$emit('tag-click', tag.name)"
                >
                  {{ tag.name }}
                </AtlasChip>
              </div>
            </td>
            <td class="cohort-table__col-author">
              {{ formatUser(cohort.createdBy) }}
            </td>
            <td class="cohort-table__col-date">
              {{ formatDate(cohort.createdDate) }}
            </td>
            <td class="cohort-table__col-date">
              {{ formatDate(lastTouchedDate(cohort)) }}
            </td>
            <td class="cohort-table__col-actions">
              <div class="cohort-table__actions">
                <AtlasIconButton
                  icon="mdi-information-outline"
                  v-bind="{ ariaLabel: t('common.cohortInformation', 'Cohort information').value }"
                  variant="text"
                  size="sm"
                  data-testid="cohort-table-info"
                  @click.stop="$emit('show-info', cohort)"
                />
                <AtlasIconButton
                  icon="mdi-content-copy"
                  v-bind="{ ariaLabel: t('common.duplicate', 'Duplicate').value }"
                  variant="text"
                  size="sm"
                  data-testid="cohort-table-copy"
                  :disabled="!canCopy || copyingId === cohort.id"
                  :loading="copyingId === cohort.id"
                  @click.stop="$emit('copy', cohort)"
                />
                <AtlasIconButton
                  icon="mdi-delete-outline"
                  v-bind="{ ariaLabel: t('common.delete', 'Delete').value }"
                  variant="text"
                  size="sm"
                  data-testid="cohort-table-delete"
                  :disabled="!access.canDelete(cohort.id)"
                  @click.stop="$emit('delete', cohort)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </AtlasCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { lastTouchedDate } from '@/utils/date-format'
import { useEntityAccessFor } from '@/composables/useEntityAccess'
import type { CohortDefinitionSummary } from '@/models/webapi.types'
import { AtlasAlert, AtlasButton, AtlasCard, AtlasChip, AtlasIcon, AtlasIconButton, AtlasSkeleton } from '@/components/ui'
import { tagColor, tagContrastColor } from '@/utils/tag-color'
import { formatCohortSortUser, sortCohorts, type CohortSortKey, type CohortSortOrder } from '@/utils/cohort-sort'

const { t, tv, locale } = useI18n()
const router = useRouter()
const access = useEntityAccessFor('cohortDefinition')

interface Props {
  cohorts: CohortDefinitionSummary[]
  loading?: boolean
  error?: Error | null
  searchQuery?: string
  selectedTags?: string[]
  canCopy?: boolean
  copyingId?: number | null
  sortKey?: CohortSortKey
  sortOrder?: CohortSortOrder
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  searchQuery: '',
  selectedTags: () => [],
  canCopy: false,
  copyingId: null,
  sortKey: undefined,
  sortOrder: undefined,
})

const emit = defineEmits<{
  retry: []
  'create-cohort': []
  'clear-filters': []
  delete: [cohort: CohortDefinitionSummary]
  copy: [cohort: CohortDefinitionSummary]
  'tag-click': [tagName: string]
  'show-info': [cohort: CohortDefinitionSummary]
  'update:sortKey': [key: CohortSortKey]
  'update:sortOrder': [order: CohortSortOrder]
}>()

const internalSortKey = ref<CohortSortKey>('modifiedDate')
const internalSortOrder = ref<CohortSortOrder>('desc')
const activeSortKey = computed(() => props.sortKey ?? internalSortKey.value)
const activeSortOrder = computed(() => props.sortOrder ?? internalSortOrder.value)

const sortIcon = computed(() => (activeSortOrder.value === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down'))

function ariaSort(key: CohortSortKey): 'ascending' | 'descending' | 'none' {
  if (activeSortKey.value !== key) return 'none'
  return activeSortOrder.value === 'asc' ? 'ascending' : 'descending'
}

function toggleSort(key: CohortSortKey) {
  if (activeSortKey.value === key) {
    const nextOrder = activeSortOrder.value === 'asc' ? 'desc' : 'asc'
    if (props.sortOrder === undefined) internalSortOrder.value = nextOrder
    emit('update:sortOrder', nextOrder)
    return
  }
  if (props.sortKey === undefined) internalSortKey.value = key
  emit('update:sortKey', key)
  // Names read best A to Z; ids and dates most useful newest first.
  const nextOrder = key === 'name' || key === 'createdBy' ? 'asc' : 'desc'
  if (props.sortOrder === undefined) internalSortOrder.value = nextOrder
  emit('update:sortOrder', nextOrder)
}

const displayedCohorts = computed(() => {
  if (props.sortKey !== undefined || props.sortOrder !== undefined) {
    return props.cohorts
  }
  return sortCohorts(props.cohorts, activeSortKey.value, activeSortOrder.value)
})

const isFiltered = computed(
  () => Boolean(props.searchQuery) || (props.selectedTags?.length ?? 0) > 0
)

const emptyMessage = computed(() => {
  if (props.searchQuery && (props.selectedTags?.length ?? 0) > 0) {
    return tv(
      'components.cohortList.emptyMatchQueryAndTags',
      'No cohorts match "{query}" with the selected tags.',
      { query: props.searchQuery }
    )
  }
  if (props.searchQuery)
    return tv('components.cohortList.emptyMatchQuery', 'No cohorts match "{query}".', {
      query: props.searchQuery,
    })
  if ((props.selectedTags?.length ?? 0) > 0)
    return tv('components.cohortList.emptyMatchTags', 'No cohorts match the selected tags.')
  return tv(
    'components.cohortList.emptyNoCohorts',
    'No cohorts yet — create one to start defining a study population.'
  )
})

const naLabel = t('common.noData', 'N/A')

function formatUser(userValue: unknown): string {
  return formatCohortSortUser(userValue)
}

function formatDate(dateValue: string | number | null | undefined): string {
  if (!dateValue) return naLabel.value
  const date = new Date(dateValue)
  if (isNaN(date.getTime())) return naLabel.value
  return date.toLocaleDateString(locale.value, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function openCohort(cohort: CohortDefinitionSummary) {
  router.push(`/cohorts/${cohort.id}`)
}
</script>

<style scoped>
.cohort-table__grid {
  background: rgb(var(--v-theme-surface));
}
.cohort-table__sort {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.cohort-table__sort:hover {
  color: var(--atlas-color-on-surface);
}
.cohort-table__sort:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.cohort-table__row {
  cursor: pointer;
}
.cohort-table__col-id {
  width: 64px;
  font-variant-numeric: tabular-nums;
  color: var(--atlas-color-on-surface-variant);
}
.cohort-table__col-name {
  min-width: 240px;
}
.cohort-table__name {
  font-weight: 500;
  color: var(--atlas-color-on-surface);
}
.cohort-table__description {
  font-size: 12px;
  color: var(--atlas-color-on-surface-variant);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 480px;
}
.cohort-table__col-tags {
  min-width: 160px;
  max-width: 280px;
}
.cohort-table__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.cohort-table__col-author {
  width: 120px;
}
.cohort-table__col-date {
  width: 120px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.cohort-table__col-actions {
  width: 132px;
  white-space: nowrap;
  text-align: right;
}

/* Hover-only action icons — keeps the long list reading as data first. */
.cohort-table__actions {
  display: inline-flex;
  gap: 0;
  opacity: 0;
  transition: opacity 120ms ease;
}
.cohort-table__row:hover .cohort-table__actions,
.cohort-table__row:focus-within .cohort-table__actions {
  opacity: 1;
}

.cohort-table__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 24px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface-variant));
}
.cohort-table__empty-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
}
.cohort-table__empty-text {
  margin: 0;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
  text-align: center;
  max-width: 480px;
}
.cohort-table__error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
</style>
