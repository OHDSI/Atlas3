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
        {{ t('components.config.tags.requiredChip').value }}
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
        {{ t('components.config.tags.columnChip').value }}
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
        {{ t('config.tags.table.headers.multiple').value }}
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
        {{ t('config.tags.table.headers.freeForm').value }}
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
        {{ t('components.config.tags.showTagsButton').value }}
      </AtlasButton>
    </template>

    <!-- Actions -->
    <template #item.actions="{ item }">
      <AtlasIconButton
        icon="mdi-pencil"
        v-bind="{ ariaLabel: tv('components.config.tags.editGroupAria') }"
        variant="text"
        size="sm"
        @click="$emit('edit', item)"
      />
      <AtlasIconButton
        icon="mdi-delete"
        v-bind="{ ariaLabel: tv('components.config.tags.deleteGroupAria') }"
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
          {{ t('config.tags.table.empty').value }}
        </p>
        <p class="text-body-2 text-grey">
          {{
            t('components.config.tags.createFirstGroup').value
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
  { title: tv('config.tags.table.headers.name'), key: 'name', sortable: true, width: '150px' },
  { title: tv('config.tags.table.headers.color'), key: 'color', sortable: false, width: '80px' },
  { title: tv('config.tags.table.headers.icon'), key: 'icon', sortable: false, width: '80px' },
  { title: tv('config.tags.table.headers.mandatory'), key: 'mandatory', sortable: true, width: '100px' },
  { title: tv('config.tags.table.headers.showColumn'), key: 'showGroup', sortable: true, width: '120px' },
  { title: tv('config.tags.table.headers.multiple'), key: 'multiSelection', sortable: true, width: '100px' },
  { title: tv('config.tags.table.headers.freeForm'), key: 'allowCustom', sortable: true, width: '100px' },
  { title: tv('config.tags.table.headers.created'), key: 'createdDate', sortable: true, width: '120px' },
  { title: tv('config.tags.table.headers.author'), key: 'createdBy', sortable: true, width: '120px' },
  { title: tv('config.tags.table.headers.description'), key: 'description', sortable: false, width: '200px' },
  { title: '', key: 'showTagsBtn', sortable: false, width: '100px' },
  { title: tv('config.tags.table.headers.actions'), key: 'actions', sortable: false, align: 'end' as const, width: '100px' },
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
  border: 1px solid var(--atlas-color-outline-strong);
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
