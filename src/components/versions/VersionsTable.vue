<template>
  <div class="versions-table">
    <!-- Filters Section (T026) -->
    <v-row
      class="mb-4"
      align="center"
    >
      <v-col
        cols="12"
        md="10"
      >
        <v-select
          v-model="selectedAuthor"
          :items="authorOptions"
          :label="tv('facets.caption.author')"
          clearable
          density="compact"
          variant="outlined"
          @update:model-value="handleAuthorFilter"
        />
      </v-col>
      <v-col
        cols="12"
        md="2"
      >
        <v-btn
          variant="text"
          color="primary"
          @click="handleClearFilters"
        >
          {{ t('components.filterPanel.buttons.clear') }}
        </v-btn>
      </v-col>
    </v-row>

    <!-- Loading State (T031) -->
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <!-- Error State -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
    >
      {{ error }}
    </v-alert>

    <!-- Versions Table (T025, T030 with virtualization) -->
    <v-data-table
      :headers="headers"
      :items="filteredVersions"
      :loading="loading"
      :items-per-page="25"
      :height="filteredVersions.length > 100 ? '600px' : undefined"
      :fixed-header="filteredVersions.length > 100"
      class="elevation-1"
    >
      <!-- Version Column -->
      <template #item.displayVersion="{ item }">
        <v-chip
          v-if="item.isCurrent"
          color="primary"
          size="small"
          variant="flat"
        >
          {{ t('components.versions.current') }}
        </v-chip>
        <span
          v-else
          class="font-weight-medium"
        >
          {{ item.version }}
        </span>
      </template>

      <!-- Author Column -->
      <template #item.createdBy="{ item }">
        <div class="d-flex align-center">
          <v-avatar
            size="24"
            color="primary"
            class="mr-2"
          >
            <span class="text-caption">
              {{ getInitials(item.createdBy.name) }}
            </span>
          </v-avatar>
          <span>{{ item.createdBy.name }}</span>
        </div>
      </template>

      <!-- Created Date Column -->
      <template #item.formattedDate="{ item }">
        <span class="text-body-2">{{ item.formattedDate }}</span>
      </template>

      <!-- Comment Column -->
      <template #item.comment="{ item }">
        <div class="comment-cell">
          <span
            v-if="item.comment"
            class="text-body-2"
          >
            {{ item.comment }}
          </span>
          <span
            v-else
            class="text-disabled text-body-2"
          >
            {{ item.isCurrent ? '—' : t('components.versions.commentPlaceholder') }}
          </span>
        </div>
      </template>

      <!-- Actions Column -->
      <template #item.actions="{ item }">
        <div class="d-flex gap-2">
          <!-- Preview Action (User Story 2) -->
          <v-btn
            v-if="!item.isCurrent"
            size="small"
            variant="text"
            color="primary"
            @click="$emit('preview', item.version)"
          >
            {{ t('components.versions.preview') }}
          </v-btn>

          <!-- Comment Action (User Story 3) -->
          <v-btn
            v-if="!item.isCurrent && config.canEdit.value"
            size="small"
            variant="text"
            color="primary"
            @click="$emit('edit-comment', item)"
          >
            {{ item.comment ? t('versions.editComment') : t('common.add') }}
          </v-btn>

          <!-- Copy Action (User Story 4) -->
          <v-btn
            v-if="!item.isCurrent"
            size="small"
            variant="text"
            color="primary"
            @click="$emit('copy', item.version)"
          >
            {{ t('versions.copy') }}
          </v-btn>
        </div>
      </template>

      <!-- No data slot -->
      <template #no-data>
        <div class="text-center pa-4">
          <v-icon
            size="48"
            color="grey-lighten-1"
            class="mb-2"
          >
            mdi-history
          </v-icon>
          <p class="text-body-1 text-medium-emphasis">
            {{ t('common.noData', 'No data available') }}
          </p>
        </div>
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { VersionsConfig, VersionsTableItem } from './types'

// Props
const props = defineProps<{
  config: VersionsConfig
  filteredVersions: VersionsTableItem[]
  loading: boolean
  error: string | null
  availableAuthors: string[]
}>()

// Emits
const emit = defineEmits<{
  (e: 'preview', versionNumber: number): void
  (e: 'edit-comment', item: VersionsTableItem): void
  (e: 'copy', versionNumber: number): void
  (e: 'clear-filters'): void
  (e: 'author-filter', author: string | null): void
}>()

// Composables
const { t, tv } = useI18n()

// Local state
const selectedAuthor = ref<string | null>(null)

// Table headers (T025)
const headers = computed(() => [
  {
    title: tv('columns.version', 'Version'),
    key: 'displayVersion',
    sortable: true,
    width: '120px',
  },
  {
    title: tv('facets.caption.author'),
    key: 'createdBy',
    sortable: true,
    width: '200px',
  },
  {
    title: tv('facets.caption.created'),
    key: 'formattedDate',
    sortable: true,
    width: '220px',
  },
  {
    title: tv('columns.comment', 'Comment'),
    key: 'comment',
    sortable: false,
  },
  {
    title: tv('columns.actions', 'Actions'),
    key: 'actions',
    sortable: false,
    width: '300px',
    align: 'end' as const,
  },
])

// Author filter options
const authorOptions = computed(() => {
  return props.availableAuthors.map(author => ({
    title: author,
    value: author,
  }))
})

// Helpers
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function handleAuthorFilter(author: string | null): void {
  emit('author-filter', author)
}

function handleClearFilters(): void {
  selectedAuthor.value = null
  emit('clear-filters')
}
</script>

<style scoped>
.versions-table {
  width: 100%;
}

.comment-cell {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
