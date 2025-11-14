<template>
  <v-expansion-panels
    v-model="panel"
    class="cohort-filters"
  >
    <v-expansion-panel>
      <v-expansion-panel-title>
        <div class="cohort-filters__header">
          <v-icon>mdi-filter-variant</v-icon>
          <span class="cohort-filters__title">{{ filtersLabel }}</span>
          <v-badge
            v-if="activeFilterCount > 0"
            :content="activeFilterCount"
            color="primary"
            inline
            class="cohort-filters__badge"
          />
        </div>
        <template #actions="{ expanded }">
          <div
            v-if="!expanded && activeFilterCount > 0"
            class="cohort-filters__chips"
            @click.stop
          >
            <v-chip
              v-if="localFilters.searchQuery"
              size="small"
              closable
              @click:close="localFilters.searchQuery = ''"
            >
              {{ searchLabel }}: {{ localFilters.searchQuery }}
            </v-chip>
            <v-chip
              v-for="tag in localFilters.selectedTags"
              :key="tag"
              size="small"
              closable
              @click:close="removeTag(tag)"
            >
              {{ tagsLabel }}: {{ tag }}
            </v-chip>
            <v-chip
              v-if="localFilters.author"
              size="small"
              closable
              @click:close="localFilters.author = undefined"
            >
              {{ authorLabel }}: {{ localFilters.author }}
            </v-chip>
            <v-chip
              v-if="localFilters.createdDateRange.from"
              size="small"
              closable
              @click:close="localFilters.createdDateRange.from = undefined"
            >
              {{ createdFromLabel }}: {{ formatDateForDisplay(localFilters.createdDateRange.from) }}
            </v-chip>
            <v-chip
              v-if="localFilters.createdDateRange.to"
              size="small"
              closable
              @click:close="localFilters.createdDateRange.to = undefined"
            >
              {{ createdToLabel }}: {{ formatDateForDisplay(localFilters.createdDateRange.to) }}
            </v-chip>
            <v-chip
              v-if="localFilters.modifiedDateRange.from"
              size="small"
              closable
              @click:close="localFilters.modifiedDateRange.from = undefined"
            >
              {{ modifiedFromLabel }}: {{ formatDateForDisplay(localFilters.modifiedDateRange.from) }}
            </v-chip>
            <v-chip
              v-if="localFilters.modifiedDateRange.to"
              size="small"
              closable
              @click:close="localFilters.modifiedDateRange.to = undefined"
            >
              {{ modifiedToLabel }}: {{ formatDateForDisplay(localFilters.modifiedDateRange.to) }}
            </v-chip>
          </div>
          <v-icon :icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
        </template>
      </v-expansion-panel-title>

      <v-expansion-panel-text>
        <div class="cohort-filters__content">
          <!-- Search Query -->
          <v-text-field
            v-model="localFilters.searchQuery"
            :label="searchLabel"
            prepend-inner-icon="mdi-magnify"
            clearable
            variant="outlined"
            density="compact"
            hide-details
            class="cohort-filters__field"
          />

          <!-- Tags Filter -->
          <v-autocomplete
            v-model="localFilters.selectedTags"
            :items="availableTags"
            :label="tagsLabel"
            prepend-inner-icon="mdi-tag-multiple"
            chips
            closable-chips
            multiple
            clearable
            variant="outlined"
            density="compact"
            hide-details
            class="cohort-filters__field"
          />

          <!-- Author Filter -->
          <v-autocomplete
            v-model="localFilters.author"
            :items="availableAuthors"
            :label="authorLabel"
            prepend-inner-icon="mdi-account"
            clearable
            variant="outlined"
            density="compact"
            hide-details
            class="cohort-filters__field"
          />

          <!-- Created Date Range -->
          <div class="cohort-filters__date-range">
            <v-text-field
              :model-value="formatDateForDisplay(localFilters.createdDateRange.from)"
              :label="createdFromLabel"
              prepend-inner-icon="mdi-calendar"
              readonly
              clearable
              variant="outlined"
              density="compact"
              hide-details
              class="cohort-filters__field"
              @click:clear="localFilters.createdDateRange.from = undefined"
              @click="showCreatedFromPicker = true"
            />
            <v-dialog
              v-model="showCreatedFromPicker"
              width="auto"
            >
              <v-date-picker
                v-model="createdFromDate"
                :title="createdFromLabel"
                @update:model-value="handleCreatedFromChange"
              />
            </v-dialog>

            <v-text-field
              :model-value="formatDateForDisplay(localFilters.createdDateRange.to)"
              :label="createdToLabel"
              prepend-inner-icon="mdi-calendar"
              readonly
              clearable
              variant="outlined"
              density="compact"
              hide-details
              class="cohort-filters__field"
              @click:clear="localFilters.createdDateRange.to = undefined"
              @click="showCreatedToPicker = true"
            />
            <v-dialog
              v-model="showCreatedToPicker"
              width="auto"
            >
              <v-date-picker
                v-model="createdToDate"
                :title="createdToLabel"
                @update:model-value="handleCreatedToChange"
              />
            </v-dialog>
          </div>

          <!-- Modified Date Range -->
          <div class="cohort-filters__date-range">
            <v-text-field
              :model-value="formatDateForDisplay(localFilters.modifiedDateRange.from)"
              :label="modifiedFromLabel"
              prepend-inner-icon="mdi-calendar"
              readonly
              clearable
              variant="outlined"
              density="compact"
              hide-details
              class="cohort-filters__field"
              @click:clear="localFilters.modifiedDateRange.from = undefined"
              @click="showModifiedFromPicker = true"
            />
            <v-dialog
              v-model="showModifiedFromPicker"
              width="auto"
            >
              <v-date-picker
                v-model="modifiedFromDate"
                :title="modifiedFromLabel"
                @update:model-value="handleModifiedFromChange"
              />
            </v-dialog>

            <v-text-field
              :model-value="formatDateForDisplay(localFilters.modifiedDateRange.to)"
              :label="modifiedToLabel"
              prepend-inner-icon="mdi-calendar"
              readonly
              clearable
              variant="outlined"
              density="compact"
              hide-details
              class="cohort-filters__field"
              @click:clear="localFilters.modifiedDateRange.to = undefined"
              @click="showModifiedToPicker = true"
            />
            <v-dialog
              v-model="showModifiedToPicker"
              width="auto"
            >
              <v-date-picker
                v-model="modifiedToDate"
                :title="modifiedToLabel"
                @update:model-value="handleModifiedToChange"
              />
            </v-dialog>
          </div>

          <!-- Actions -->
          <div class="cohort-filters__actions">
            <v-btn
              :disabled="activeFilterCount === 0"
              variant="outlined"
              prepend-icon="mdi-filter-remove"
              @click="handleClearAll"
            >
              {{ clearAllLabel }}
            </v-btn>
          </div>
        </div>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { FilterState } from '@/composables/useCohorts'

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
const searchLabel = t('common.search', 'Search')
const tagsLabel = t('common.tags', 'Tags')
const authorLabel = t('columns.author', 'Author')
const createdFromLabel = t('common.createdFrom', 'Created From')
const createdToLabel = t('common.createdTo', 'Created To')
const modifiedFromLabel = t('common.modifiedFrom', 'Modified From')
const modifiedToLabel = t('common.modifiedTo', 'Modified To')
const clearAllLabel = t('common.clearAll', 'Clear All')

const panel = ref<number | undefined>(undefined)
const localFilters = ref<FilterState>({ ...props.filters })

// Date picker states
const showCreatedFromPicker = ref(false)
const showCreatedToPicker = ref(false)
const showModifiedFromPicker = ref(false)
const showModifiedToPicker = ref(false)

// Date picker models (Vuetify uses Date objects)
const createdFromDate = ref<Date | undefined>(props.filters.createdDateRange.from)
const createdToDate = ref<Date | undefined>(props.filters.createdDateRange.to)
const modifiedFromDate = ref<Date | undefined>(props.filters.modifiedDateRange.from)
const modifiedToDate = ref<Date | undefined>(props.filters.modifiedDateRange.to)

// Flag to prevent circular updates
let isInternalUpdate = false

// Watch for external changes to filters
watch(() => props.filters, async (newFilters) => {
  isInternalUpdate = true
  localFilters.value = { ...newFilters }
  createdFromDate.value = newFilters.createdDateRange.from
  createdToDate.value = newFilters.createdDateRange.to
  modifiedFromDate.value = newFilters.modifiedDateRange.from
  modifiedToDate.value = newFilters.modifiedDateRange.to
  await nextTick()
  isInternalUpdate = false
}, { deep: true })

// Watch for local changes and emit (skip during external updates)
watch(localFilters, (newFilters) => {
  if (isInternalUpdate) return
  emit('update:filters', { ...newFilters })
}, { deep: true })

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
  margin-bottom: 20px;
}

.cohort-filters__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cohort-filters__title {
  font-weight: 500;
  font-size: 1rem;
}

.cohort-filters__badge {
  margin-left: auto;
}

.cohort-filters__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: 16px;
  margin-right: 16px;
  align-items: center;
}

.cohort-filters__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.cohort-filters__field {
  max-width: 100%;
}

.cohort-filters__date-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 600px) {
  .cohort-filters__date-range {
    grid-template-columns: 1fr;
  }
}

.cohort-filters__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
