<template>
  <AtlasDataTable
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
      <AtlasIcon
        v-if="item.icon"
        :title="item.icon"
      >
        {{ item.icon }}
      </AtlasIcon>
      <span
        v-else
        class="text-grey-lighten-1"
      >—</span>
    </template>

    <!-- Boolean Flags as Chips -->
    <template #item.mandatory="{ item }">
      <AtlasChip
        v-if="item.mandatory"
        size="sm"
        tone="danger"
      >
        {{ t('components.config.tags.requiredChip', 'Required').value }}
      </AtlasChip>
      <span
        v-else
        class="text-grey-lighten-1"
      >—</span>
    </template>

    <template #item.showGroup="{ item }">
      <AtlasChip
        v-if="item.showGroup"
        size="sm"
        tone="primary"
      >
        {{ t('components.config.tags.columnChip', 'Column').value }}
      </AtlasChip>
      <span
        v-else
        class="text-grey-lighten-1"
      >—</span>
    </template>

    <template #item.multiSelection="{ item }">
      <AtlasChip
        v-if="item.multiSelection"
        size="sm"
        tone="info"
      >
        {{ t('config.tags.table.headers.multiple', 'Multiple').value }}
      </AtlasChip>
      <span
        v-else
        class="text-grey-lighten-1"
      >—</span>
    </template>

    <template #item.allowCustom="{ item }">
      <AtlasChip
        v-if="item.allowCustom"
        size="sm"
        tone="success"
      >
        {{ t('config.tags.table.headers.freeForm', 'Free-form').value }}
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
      <AtlasButton
        variant="ghost"
        size="sm"
        @click="$emit('showTags', item)"
      >
        {{ t('components.config.tags.showTagsButton', 'Show Tags').value }}
      </AtlasButton>
    </template>

    <!-- Actions -->
    <template #item.actions="{ item }">
      <AtlasIconButton
        icon="mdi-pencil"
        v-bind="{ ariaLabel: tv('components.config.tags.editGroupAria', 'Edit tag group') }"
        variant="text"
        size="sm"
        @click="$emit('edit', item)"
      />
      <AtlasIconButton
        icon="mdi-delete"
        v-bind="{ ariaLabel: tv('components.config.tags.deleteGroupAria', 'Delete tag group') }"
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
          {{ t('config.tags.table.empty', 'No tag groups found').value }}
        </p>
        <p class="text-body-2 text-grey">
          {{
            t(
              'components.config.tags.createFirstGroup',
              'Create your first tag group to get started'
            ).value
          }}
        </p>
      </div>
    </template>
  </AtlasDataTable>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasChip, AtlasDataTable, AtlasIcon, AtlasIconButton } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { TagGroup } from '@/models/config.types'

const { t, tv } = useI18n()

interface Props {
  items: TagGroup[]
  loading?: boolean
}

defineProps<Props>()

defineEmits<{
  edit: [tagGroup: TagGroup]
  delete: [tagGroup: TagGroup]
  showTags: [tagGroup: TagGroup]
}>()

const headers = [
  { title: tv('config.tags.table.headers.name', 'Name'), key: 'name', sortable: true, width: '150px' },
  { title: tv('config.tags.table.headers.color', 'Color'), key: 'color', sortable: false, width: '80px' },
  { title: tv('config.tags.table.headers.icon', 'Icon'), key: 'icon', sortable: false, width: '80px' },
  { title: tv('config.tags.table.headers.mandatory', 'Mandatory'), key: 'mandatory', sortable: true, width: '100px' },
  { title: tv('config.tags.table.headers.showColumn', 'Show Column'), key: 'showGroup', sortable: true, width: '120px' },
  { title: tv('config.tags.table.headers.multiple', 'Multiple'), key: 'multiSelection', sortable: true, width: '100px' },
  { title: tv('config.tags.table.headers.freeForm', 'Free-form'), key: 'allowCustom', sortable: true, width: '100px' },
  { title: tv('config.tags.table.headers.created', 'Created'), key: 'createdDate', sortable: true, width: '120px' },
  { title: tv('config.tags.table.headers.author', 'Author'), key: 'createdBy', sortable: true, width: '120px' },
  { title: tv('config.tags.table.headers.description', 'Description'), key: 'description', sortable: false, width: '200px' },
  { title: '', key: 'showTagsBtn', sortable: false, width: '100px' },
  { title: tv('config.tags.table.headers.actions', 'Actions'), key: 'actions', sortable: false, align: 'end' as const, width: '100px' },
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
