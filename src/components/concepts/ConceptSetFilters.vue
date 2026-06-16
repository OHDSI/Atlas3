<template>
  <div class="concept-set-filters">
    <div class="concept-set-filters__bar">
      <AtlasTextField
        v-model="localFilters.searchQuery"
        :placeholder="searchLabel"
        prepend-icon="mdi-magnify"
        clearable
        variant="outlined"
        hide-details
        class="concept-set-filters__search"
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
            class="concept-set-filters__menu-btn"
          >
            {{ filtersLabel }}
            <AtlasChip
              v-if="activeFilterCount > 0"
              size="sm"
              variant="flat"
              tone="primary"
              class="concept-set-filters__menu-count"
            >
              {{ activeFilterCount }}
            </AtlasChip>
          </AtlasButton>
        </template>

        <AtlasCard
          padding="none"
          class="concept-set-filters__menu-card"
        >
          <div class="concept-set-filters__menu-header">
            <span class="text-eyebrow">{{ filtersLabel }}</span>
            <AtlasSpacer />
            <AtlasButton
              :disabled="activeFilterCount === 0"
              variant="ghost"
              size="sm"
              @click="emit('clear')"
            >
              {{ clearAllLabel }}
            </AtlasButton>
          </div>

          <div class="concept-set-filters__menu-body">
            <AtlasAutocomplete
              v-model="localFilters.author"
              :items="availableAuthors"
              :label="authorLabel"
              prepend-inner-icon="mdi-account-outline"
              clearable
              variant="outlined"
              hide-details
            />

            <div class="concept-set-filters__menu-section-label">
              {{ createdLabel }}
            </div>
            <div class="concept-set-filters__date-range">
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

            <div class="concept-set-filters__menu-section-label">
              {{ modifiedLabel }}
            </div>
            <div class="concept-set-filters__date-range">
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

    <div
      v-if="hasNonSearchFilters"
      class="concept-set-filters__active"
    >
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
        @click="emit('clear')"
      >
        {{ clearAllLabel }}
      </AtlasButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { ConceptSetFilterState } from '@/stores/concept-sets'
import { AtlasAutocomplete, AtlasButton, AtlasCard, AtlasChip, AtlasDialog, AtlasMenu, AtlasSpacer, AtlasTextField } from '@/components/ui'

interface Props {
  filters: ConceptSetFilterState
  availableAuthors: string[]
  activeFilterCount: number
}

interface Emits {
  (e: 'update:filters', filters: ConceptSetFilterState): void
  (e: 'clear'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t, locale } = useI18n()

const filtersLabel = t('common.filters', 'Filters')
const searchLabel = t('common.search', 'Search concept sets…')
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
const localFilters = ref<ConceptSetFilterState>({
  ...props.filters,
  createdDateRange: { ...props.filters.createdDateRange },
  modifiedDateRange: { ...props.filters.modifiedDateRange },
})

const showCreatedFromPicker = ref(false)
const showCreatedToPicker = ref(false)
const showModifiedFromPicker = ref(false)
const showModifiedToPicker = ref(false)

const createdFromDate = ref<Date | undefined>(props.filters.createdDateRange.from)
const createdToDate = ref<Date | undefined>(props.filters.createdDateRange.to)
const modifiedFromDate = ref<Date | undefined>(props.filters.modifiedDateRange.from)
const modifiedToDate = ref<Date | undefined>(props.filters.modifiedDateRange.to)

const hasNonSearchFilters = computed(
  () =>
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
    localFilters.value = {
      ...newFilters,
      createdDateRange: { ...newFilters.createdDateRange },
      modifiedDateRange: { ...newFilters.modifiedDateRange },
    }
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
</script>

<style scoped>
.concept-set-filters {
  width: 100%;
}

.concept-set-filters__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.concept-set-filters__search {
  flex: 1 1 320px;
  max-width: 420px;
}

.concept-set-filters__menu-btn {
  flex-shrink: 0;
}

.concept-set-filters__menu-count {
  margin-inline-start: 8px;
  height: 18px !important;
  font-size: 11px !important;
}

.concept-set-filters__menu-card {
  width: 420px;
  max-width: 90vw;
}

.concept-set-filters__menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant, 224, 224, 224));
}

.concept-set-filters__menu-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.concept-set-filters__menu-section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 4px 0 -4px;
}

.concept-set-filters__date-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.concept-set-filters__active {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

@media (max-width: 600px) {
  .concept-set-filters__date-range {
    grid-template-columns: 1fr;
  }
  .concept-set-filters__menu-card {
    width: 320px;
  }
}
</style>
