<template>
  <AtlasDataTable
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
          <AtlasIcon
            size="small"
            color="white"
          >
            {{ item.icon || item.groups[0]?.icon || 'mdi-tag' }}
          </AtlasIcon>
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
      <AtlasChip
        v-if="item.permissionProtected"
        size="sm"
        tone="warning"
      >
        {{ t('configuration.tagManagement.protected', 'Protected').value }}
      </AtlasChip>
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
      <AtlasChip
        size="sm"
        variant="outlined"
      >
        {{ item.count || 0 }}
      </AtlasChip>
    </template>

    <!-- Actions -->
    <template #item.actions="{ item }">
      <AtlasIconButton
        icon="mdi-pencil"
        v-bind="{ ariaLabel: tv('components.config.tags.editTagAria', 'Edit tag') }"
        variant="text"
        size="sm"
        @click="$emit('edit', item)"
      />
      <AtlasIconButton
        icon="mdi-delete"
        v-bind="{ ariaLabel: tv('components.config.tags.deleteTagAria', 'Delete tag') }"
        variant="text"
        tone="danger"
        size="sm"
        @click="$emit('delete', item)"
      />
    </template>

    <!-- Empty State -->
    <template #no-data>
      <div class="text-center pa-4">
        <AtlasIcon
          size="64"
          color="grey-lighten-1"
        >
          mdi-tag-off-outline
        </AtlasIcon>
        <p class="text-h6 mt-2">
          {{ t('components.config.tags.noTagsInGroup', 'No tags in this group').value }}
        </p>
        <p class="text-body-2 text-grey">
          {{ t('components.config.tags.createFirstTag', 'Create your first tag to get started').value }}
        </p>
      </div>
    </template>
  </AtlasDataTable>
</template>

<script setup lang="ts">
import { AtlasChip, AtlasDataTable, AtlasIcon, AtlasIconButton } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { Tag } from '@/models/config.types'

const { t, tv } = useI18n()

interface Props {
  items: Tag[]
  loading?: boolean
}

defineProps<Props>()

defineEmits<{
  edit: [tag: Tag]
  delete: [tag: Tag]
}>()

const headers = [
  { title: tv('components.config.tags.tagColumn', 'Tag'), key: 'name', sortable: true, width: '200px' },
  { title: tv('configuration.tagManagement.protected', 'Protected'), key: 'permissionProtected', sortable: true, width: '100px' },
  { title: tv('config.tags.table.headers.created', 'Created'), key: 'createdDate', sortable: true, width: '120px' },
  { title: tv('columns.author', 'Author'), key: 'createdBy', sortable: true, width: '120px' },
  { title: tv('config.tags.table.headers.description', 'Description'), key: 'description', sortable: false, width: '250px' },
  { title: tv('components.config.tags.usageColumn', 'Usage'), key: 'count', sortable: true, width: '80px' },
  { title: tv('columns.actions', 'Actions'), key: 'actions', sortable: false, align: 'end' as const, width: '100px' },
]

/**
 * Format ISO date string to readable format
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
  border: 1px solid var(--atlas-color-outline-strong);
}

.tag-badge__name {
  font-weight: 500;
}
</style>
