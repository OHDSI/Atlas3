<template>
  <v-data-table
    :headers="headers"
    :items="items"
    :loading="loading"
    class="tag-group-table"
  >
    <!-- Color Swatch -->
    <template #item.color="{ item }">
      <div
        v-if="item.color"
        class="color-swatch"
        :style="{ backgroundColor: item.color }"
        :title="item.color"
      />
      <span
        v-else
        class="text-grey-lighten-1"
      >—</span>
    </template>

    <!-- Icon Preview -->
    <template #item.icon="{ item }">
      <v-icon
        v-if="item.icon"
        :title="item.icon"
      >
        {{ item.icon }}
      </v-icon>
      <span
        v-else
        class="text-grey-lighten-1"
      >—</span>
    </template>

    <!-- Boolean Flags as Chips -->
    <template #item.mandatory="{ item }">
      <v-chip
        v-if="item.mandatory"
        size="small"
        color="error"
        variant="flat"
      >
        Required
      </v-chip>
      <span
        v-else
        class="text-grey-lighten-1"
      >—</span>
    </template>

    <template #item.showGroup="{ item }">
      <v-chip
        v-if="item.showGroup"
        size="small"
        color="primary"
        variant="tonal"
      >
        Column
      </v-chip>
      <span
        v-else
        class="text-grey-lighten-1"
      >—</span>
    </template>

    <template #item.multiSelection="{ item }">
      <v-chip
        v-if="item.multiSelection"
        size="small"
        color="info"
        variant="tonal"
      >
        Multiple
      </v-chip>
      <span
        v-else
        class="text-grey-lighten-1"
      >—</span>
    </template>

    <template #item.allowCustom="{ item }">
      <v-chip
        v-if="item.allowCustom"
        size="small"
        color="success"
        variant="tonal"
      >
        Free-form
      </v-chip>
      <span
        v-else
        class="text-grey-lighten-1"
      >—</span>
    </template>

    <!-- Created Date -->
    <template #item.createdDate="{ item }">
      <span v-if="item.createdDate">{{ formatDate(item.createdDate) }}</span>
      <span
        v-else
        class="text-grey-lighten-1"
      >—</span>
    </template>

    <!-- Author -->
    <template #item.createdBy="{ item }">
      <span v-if="item.createdBy">{{ item.createdBy.login }}</span>
      <span
        v-else
        class="text-grey-lighten-1"
      >—</span>
    </template>

    <!-- Description (truncated) -->
    <template #item.description="{ item }">
      <span
        v-if="item.description"
        :title="item.description"
      >
        {{ truncate(item.description, 50) }}
      </span>
      <span
        v-else
        class="text-grey-lighten-1"
      >—</span>
    </template>

    <!-- Show Tags Button -->
    <template #item.showTagsBtn="{ item }">
      <v-btn
        variant="text"
        size="small"
        @click="$emit('showTags', item)"
      >
        Show Tags
      </v-btn>
    </template>

    <!-- Actions -->
    <template #item.actions="{ item }">
      <v-btn
        icon="mdi-pencil"
        size="small"
        variant="text"
        aria-label="Edit tag group"
        @click="$emit('edit', item)"
      />
      <v-btn
        icon="mdi-delete"
        size="small"
        variant="text"
        color="error"
        aria-label="Delete tag group"
        @click="$emit('delete', item)"
      />
    </template>

    <!-- Empty State -->
    <template #no-data>
      <div class="text-center pa-4">
        <v-icon
          size="64"
          color="grey-lighten-1"
        >
          mdi-tag-off-outline
        </v-icon>
        <p class="text-h6 mt-2">
          No tag groups found
        </p>
        <p class="text-body-2 text-grey">
          Create your first tag group to get started
        </p>
      </div>
    </template>
  </v-data-table>
</template>

<script setup lang="ts">
import type { TagGroup } from '@/models/config.types'

interface Props {
  items: TagGroup[]
  loading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'edit': [tagGroup: TagGroup]
  'delete': [tagGroup: TagGroup]
  'showTags': [tagGroup: TagGroup]
}>()

const headers = [
  { title: 'Name', key: 'name', sortable: true, width: '150px' },
  { title: 'Color', key: 'color', sortable: false, width: '80px' },
  { title: 'Icon', key: 'icon', sortable: false, width: '80px' },
  { title: 'Mandatory', key: 'mandatory', sortable: true, width: '100px' },
  { title: 'Show Column', key: 'showGroup', sortable: true, width: '120px' },
  { title: 'Multiple', key: 'multiSelection', sortable: true, width: '100px' },
  { title: 'Free-form', key: 'allowCustom', sortable: true, width: '100px' },
  { title: 'Created', key: 'createdDate', sortable: true, width: '120px' },
  { title: 'Author', key: 'createdBy', sortable: true, width: '120px' },
  { title: 'Description', key: 'description', sortable: false, width: '200px' },
  { title: '', key: 'showTagsBtn', sortable: false, width: '100px' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const, width: '100px' }
] as const

/**
 * Format ISO date string to readable format
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

/**
 * Truncate text to specified length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
</script>

<style scoped>
.tag-group-table {
  width: 100%;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  display: inline-block;
}

/* Responsive table */
@media (max-width: 768px) {
  .tag-group-table :deep(.v-table__wrapper) {
    overflow-x: auto;
  }

  .tag-group-table :deep(.v-data-table__th) {
    min-width: 100px;
  }

  .tag-group-table :deep(.v-data-table__th:first-child) {
    min-width: 150px;
  }
}
</style>
