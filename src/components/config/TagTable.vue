<template>
  <v-data-table
    :headers="headers"
    :items="items"
    :loading="loading"
    class="tag-table"
  >
    <!-- Tag Name with Color and Icon -->
    <template #item.name="{ item }">
      <div class="tag-badge">
        <span
          class="tag-badge__swatch"
          :style="{ backgroundColor: item.color || item.groups[0]?.color || '#cecece' }"
        >
          <v-icon
            size="small"
            color="white"
          >
            {{ item.icon || item.groups[0]?.icon || 'mdi-tag' }}
          </v-icon>
        </span>
        <span
          class="tag-badge__name"
          :title="item.name"
        >
          {{ truncate(item.name, 30) }}
        </span>
      </div>
    </template>

    <!-- Permission Protected -->
    <template #item.permissionProtected="{ item }">
      <v-chip
        v-if="item.permissionProtected"
        size="small"
        color="warning"
        variant="flat"
      >
        Protected
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

    <!-- Description -->
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

    <!-- Usage Count -->
    <template #item.count="{ item }">
      <v-chip
        size="small"
        variant="outlined"
      >
        {{ item.count || 0 }}
      </v-chip>
    </template>

    <!-- Actions -->
    <template #item.actions="{ item }">
      <v-btn
        icon="mdi-pencil"
        size="small"
        variant="text"
        aria-label="Edit tag"
        @click="$emit('edit', item)"
      />
      <v-btn
        icon="mdi-delete"
        size="small"
        variant="text"
        color="error"
        aria-label="Delete tag"
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
          No tags in this group
        </p>
        <p class="text-body-2 text-grey">
          Create your first tag to get started
        </p>
      </div>
    </template>
  </v-data-table>
</template>

<script setup lang="ts">
import type { Tag } from '@/models/config.types'

interface Props {
  items: Tag[]
  loading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'edit': [tag: Tag]
  'delete': [tag: Tag]
}>()

const headers = [
  { title: 'Tag', key: 'name', sortable: true, width: '200px' },
  { title: 'Protected', key: 'permissionProtected', sortable: true, width: '100px' },
  { title: 'Created', key: 'createdDate', sortable: true, width: '120px' },
  { title: 'Author', key: 'createdBy', sortable: true, width: '120px' },
  { title: 'Description', key: 'description', sortable: false, width: '250px' },
  { title: 'Usage', key: 'count', sortable: true, width: '80px' },
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
.tag-table {
  width: 100%;
}

.tag-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-badge__swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.tag-badge__name {
  font-weight: 500;
}
</style>
