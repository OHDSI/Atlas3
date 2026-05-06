<template>
  <div class="cohort-filters">
    <!-- Quiet, modern filter bar:
         - search input always visible (most-used)
         - "Filters" button opens a wide menu with the rest
         - active filter values render as removable chips on the bar -->
    <div class="cohort-filters__bar">
      <AtlasTextField
        v-model="localFilters.searchQuery"
        :placeholder="searchLabel"
        prepend-icon="mdi-magnify"
        clearable
        variant="outlined"
        hide-details
        class="cohort-filters__search"
      />

      <AtlasMenu
        v-model="filtersMenuOpen"
        :close-on-content-click="false"
        location="bottom end"
        offset="8"
      >
        <template #activator="{ props: activatorProps }">
          <AtlasButton
            v-bind="activatorProps"
            variant="secondary"
            icon="mdi-filter-variant"
            class="cohort-filters__menu-btn"
          >
            {{ filtersLabel }}
            <AtlasChip
              v-if="activeFilterCount > 0"
              size="sm"
              variant="flat"
              tone="primary"
              class="cohort-filters__menu-count"
            >
              {{ activeFilterCount }}
            </AtlasChip>
          </AtlasButton>
        </template>

        <AtlasCard
          padding="none"
          class="cohort-filters__menu-card"
        >
          <div class="cohort-filters__menu-header">
            <span class="text-eyebrow">{{ filtersLabel }}</span>
            <AtlasSpacer />
            <AtlasButton
              :disabled="activeFilterCount === 0"
              variant="ghost"
              size="sm"
              @click="handleClearAll"
            >
              {{ clearAllLabel }}
            </AtlasButton>
          </div>

          <div class="cohort-filters__menu-body">
            <AtlasAutocomplete
              v-model="localFilters.selectedTags"
              :items="availableTags"
              :label="tagsLabel"
              prepend-inner-icon="mdi-tag-multiple-outline"
              chips
              closable-chips
              multiple
              clearable
              variant="outlined"
              hide-details
            />

            <AtlasAutocomplete
              v-model="localFilters.author"
              :items="availableAuthors"
              :label="authorLabel"
              prepend-inner-icon="mdi-account-outline"
              clearable
              variant="outlined"
              hide-details
            />

            <div class="cohort-filters__menu-section-label">
              {{ createdLabel }}
            </div>
            <div class="cohort-filters__date-range">
              <AtlasTextField
                :model-value="formatDateForDisplay(localFilters.createdDateRange.from)"
                :label="fromLabel"
                prepend-icon="mdi-calendar-outline"
                readonly
                clearable
                variant="outlined"
                hide-details
                @click:clear="localFilters.createdDateRange.from = undefined"
                @click="showCreatedFromPicker = true"
              />
              <AtlasDialog
                v-model="showCreatedFromPicker"
                chromeless
                width="auto"
              >
                <v-date-picker
                  v-model="createdFromDate"
                  :title="createdFromLabel"
                  @update:model-value="handleCreatedFromChange"
                />
              </AtlasDialog>

              <AtlasTextField
                :model-value="formatDateForDisplay(localFilters.createdDateRange.to)"
                :label="toLabel"
                prepend-icon="mdi-calendar-outline"
                readonly
                clearable
                variant="outlined"
                hide-details
                @click:clear="localFilters.createdDateRange.to = undefined"
                @click="showCreatedToPicker = true"
              />
              <AtlasDialog
                v-model="showCreatedToPicker"
                chromeless
                width="auto"
              >
                <v-date-picker
                  v-model="createdToDate"
                  :title="createdToLabel"
                  @update:model-value="handleCreatedToChange"
                />
              </AtlasDialog>
            </div>

            <div class="cohort-filters__menu-section-label">
              {{ modifiedLabel }}
            </div>
            <div class="cohort-filters__date-range">
              <AtlasTextField
                :model-value="formatDateForDisplay(localFilters.modifiedDateRange.from)"
                :label="fromLabel"
                prepend-icon="mdi-calendar-outline"
                readonly
                clearable
                variant="outlined"
                hide-details
                @click:clear="localFilters.modifiedDateRange.from = undefined"
                @click="showModifiedFromPicker = true"
              />
              <AtlasDialog
                v-model="showModifiedFromPicker"
                chromeless
                width="auto"
              >
                <v-date-picker
                  v-model="modifiedFromDate"
                  :title="modifiedFromLabel"
                  @update:model-value="handleModifiedFromChange"
                />
              </AtlasDialog>

              <AtlasTextField
                :model-value="formatDateForDisplay(localFilters.modifiedDateRange.to)"
                :label="toLabel"
                prepend-icon="mdi-calendar-outline"
                readonly
                clearable
                variant="outlined"
                hide-details
                @click:clear="localFilters.modifiedDateRange.to = undefined"
                @click="showModifiedToPicker = true"
              />
              <AtlasDialog
                v-model="showModifiedToPicker"
                chromeless
                width="auto"
              >
                <v-date-picker
                  v-model="modifiedToDate"
                  :title="modifiedToLabel"
                  @update:model-value="handleModifiedToChange"
                />
              </AtlasDialog>
            </div>
          </div>
        </AtlasCard>
      </AtlasMenu>
    </div>

    <!-- Active filter chips (shown below the bar so they don't crowd it). -->
    <div
      v-if="hasNonSearchFilters"
      class="cohort-filters__active"
    >
      <AtlasChip
        v-for="tag in localFilters.selectedTags"
        :key="`tag-${tag}`"
        size="sm"
        closable
        @close="removeTag(tag)"
      >
        {{ tagsLabel }}: {{ tag }}
      </AtlasChip>
      <AtlasChip
        v-if="localFilters.author"
        size="sm"
        closable
        @close="localFilters.author = ''"
      >
        {{ authorLabel }}: {{ localFilters.author }}
      </AtlasChip>
      <AtlasChip
        v-if="localFilters.createdDateRange.from"
        size="sm"
        closable
        @close="localFilters.createdDateRange.from = undefined"
      >
        {{ createdFromLabel }}: {{ formatDateForDisplay(localFilters.createdDateRange.from) }}
      </AtlasChip>
      <AtlasChip
        v-if="localFilters.createdDateRange.to"
        size="sm"
        closable
        @close="localFilters.createdDateRange.to = undefined"
      >
        {{ createdToLabel }}: {{ formatDateForDisplay(localFilters.createdDateRange.to) }}
      </AtlasChip>
      <AtlasChip
        v-if="localFilters.modifiedDateRange.from"
        size="sm"
        closable
        @close="localFilters.modifiedDateRange.from = undefined"
      >
        {{ modifiedFromLabel }}: {{ formatDateForDisplay(localFilters.modifiedDateRange.from) }}
      </AtlasChip>
      <AtlasChip
        v-if="localFilters.modifiedDateRange.to"
        size="sm"
        closable
        @close="localFilters.modifiedDateRange.to = undefined"
      >
        {{ modifiedToLabel }}: {{ formatDateForDisplay(localFilters.modifiedDateRange.to) }}
      </AtlasChip>
      <AtlasButton
        v-if="activeFilterCount > 0"
        variant="ghost"
        size="sm"
        icon="mdi-close"
        @click="handleClearAll"
      >
        {{ clearAllLabel }}
      </AtlasButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { FilterState } from '@/composables/useCohorts'
import { AtlasButton, AtlasAutocomplete, AtlasCard, AtlasChip, AtlasDialog, AtlasMenu, AtlasSpacer, AtlasTextField } from '@/components/ui'

interface Props {
  filters: FilterState
  availableTags: string[]
  availableAuthors: string[]
  activeFilterCount: number
}

interface Emits {
  (e: 'update:filters', filters: FilterState): void
  (e: 'clear'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t, locale } = useI18n()

const filtersLabel = t('common.filters', 'Filters')
const searchLabel = t('common.search', 'Search cohorts…')
const tagsLabel = t('common.tags', 'Tags')
const authorLabel = t('columns.author', 'Author')
const createdLabel = t('columns.created', 'Created')
const modifiedLabel = t('columns.modified', 'Modified')
const fromLabel = t('common.from', 'From')
const toLabel = t('common.to', 'To')
const createdFromLabel = t('common.createdFrom', 'Created from')
const createdToLabel = t('common.createdTo', 'Created to')
const modifiedFromLabel = t('common.modifiedFrom', 'Modified from')
const modifiedToLabel = t('common.modifiedTo', 'Modified to')
const clearAllLabel = t('search.clearAllSelections', 'Clear all')

const filtersMenuOpen = ref(false)
const localFilters = ref<FilterState>({ ...props.filters })

const showCreatedFromPicker = ref(false)
const showCreatedToPicker = ref(false)
const showModifiedFromPicker = ref(false)
const showModifiedToPicker = ref(false)

const createdFromDate = ref<Date | undefined>(props.filters.createdDateRange.from)
const createdToDate = ref<Date | undefined>(props.filters.createdDateRange.to)
const modifiedFromDate = ref<Date | undefined>(props.filters.modifiedDateRange.from)
const modifiedToDate = ref<Date | undefined>(props.filters.modifiedDateRange.to)

// Search is shown directly in the bar — only render the active-chip
// row for the rest, so the search query doesn't appear twice.
const hasNonSearchFilters = computed(
  () =>
    localFilters.value.selectedTags.length > 0 ||
    !!localFilters.value.author ||
    !!localFilters.value.createdDateRange.from ||
    !!localFilters.value.createdDateRange.to ||
    !!localFilters.value.modifiedDateRange.from ||
    !!localFilters.value.modifiedDateRange.to
)

let isInternalUpdate = false

watch(
  () => props.filters,
  async newFilters => {
    isInternalUpdate = true
    localFilters.value = { ...newFilters }
    createdFromDate.value = newFilters.createdDateRange.from
    createdToDate.value = newFilters.createdDateRange.to
    modifiedFromDate.value = newFilters.modifiedDateRange.from
    modifiedToDate.value = newFilters.modifiedDateRange.to
    await nextTick()
    isInternalUpdate = false
  },
  { deep: true }
)

watch(
  localFilters,
  newFilters => {
    if (isInternalUpdate) return
    emit('update:filters', { ...newFilters })
  },
  { deep: true }
)

function formatDateForDisplay(date: Date | undefined): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function handleCreatedFromChange(date: Date) {
  localFilters.value.createdDateRange.from = date
  showCreatedFromPicker.value = false
}

function handleCreatedToChange(date: Date) {
  localFilters.value.createdDateRange.to = date
  showCreatedToPicker.value = false
}

function handleModifiedFromChange(date: Date) {
  localFilters.value.modifiedDateRange.from = date
  showModifiedFromPicker.value = false
}

function handleModifiedToChange(date: Date) {
  localFilters.value.modifiedDateRange.to = date
  showModifiedToPicker.value = false
}

function handleClearAll() {
  emit('clear')
}

function removeTag(tag: string) {
  const index = localFilters.value.selectedTags.indexOf(tag)
  if (index > -1) {
    localFilters.value.selectedTags.splice(index, 1)
  }
}
</script>

<style scoped>
.cohort-filters {
  width: 100%;
}

.cohort-filters__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.cohort-filters__search {
  flex: 1 1 320px;
  max-width: 480px;
}

.cohort-filters__menu-btn {
  flex-shrink: 0;
}

.cohort-filters__menu-count {
  margin-inline-start: 8px;
  height: 18px !important;
  font-size: 11px !important;
}

.cohort-filters__menu-card {
  width: 420px;
  max-width: 90vw;
}

.cohort-filters__menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant, 224, 224, 224));
}

.cohort-filters__menu-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cohort-filters__menu-section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 4px 0 -4px;
}

.cohort-filters__date-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.cohort-filters__active {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

@media (max-width: 600px) {
  .cohort-filters__date-range {
    grid-template-columns: 1fr;
  }
  .cohort-filters__menu-card {
    width: 320px;
  }
}
</style>
