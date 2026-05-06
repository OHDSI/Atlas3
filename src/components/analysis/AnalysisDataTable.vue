<template>
  <AtlasDataTable
    :headers="headers"
    :items="items"
    :loading="loading"
    :items-per-page="itemsPerPage"
    :sort-by="sortBy"
    hide-default-footer
    class="analysis-data-table"
    :data-testid="testid"
  >
    <template #[`item.${nameKey}`]="{ item }">
      <div class="analysis-data-table__name-cell">
        <a
          href="#"
          class="analysis-data-table__name-link"
          :data-testid="testid ? `${testid}-row-name` : undefined"
          @click.prevent="$emit('open', item)"
        >
          {{ getName(item) }}
        </a>
        <div
          v-if="hasTags(item)"
          class="analysis-data-table__tag-rail"
        >
          <v-chip
            v-for="tag in visibleTags(item)"
            :key="tag.name"
            size="x-small"
            variant="flat"
            density="compact"
            class="analysis-data-table__tag"
            :style="{ backgroundColor: tagColor(tag.color), color: tagContrastColor(tag.color) }"
          >
            {{ tag.name }}
          </v-chip>
          <span
            v-if="overflowTagCount(item) > 0"
            class="analysis-data-table__tag-overflow"
            :title="overflowTagsTitle(item)"
          >
            +{{ overflowTagCount(item) }}
          </span>
        </div>
      </div>
    </template>

    <template #[`item.description`]="{ item }">
      <span class="analysis-data-table__description">
        {{ truncate(strField(item, 'description')) }}
      </span>
    </template>

    <template #[`item.modifiedDate`]="{ item }">
      <span :title="formatDate(dateField(item, 'modifiedDate'))">
        {{ formatRelativeTime(dateField(item, 'modifiedDate')) }}
      </span>
    </template>

    <template #[`item.createdDate`]="{ item }">
      <span :title="formatDate(dateField(item, 'createdDate'))">
        {{ formatRelativeTime(dateField(item, 'createdDate')) }}
      </span>
    </template>

    <template #[`item.createdBy`]="{ item }">
      {{ formatUser((item as Record<string, unknown>).createdBy) }}
    </template>

    <template #[`item.actions`]="{ item }">
      <div class="analysis-data-table__row-actions">
        <AtlasIconButton
          icon="mdi-pencil"
          v-bind="{ ariaLabel: t('configuration.tagManagement.edit', 'Edit').value }"
          variant="text"
          size="sm"
          @click.stop="$emit('open', item)"
        />
        <AtlasIconButton
          v-if="enableCopy"
          icon="mdi-content-copy"
          v-bind="{ ariaLabel: t('common.copy', 'Copy').value }"
          variant="text"
          size="sm"
          :disabled="!canCopyItem(item)"
          @click.stop="$emit('copy', item)"
        />
        <AtlasIconButton
          icon="mdi-delete"
          v-bind="{ ariaLabel: t('common.delete', 'Delete').value }"
          variant="text"
          tone="danger"
          size="sm"
          :disabled="!canDeleteItem(item)"
          @click.stop="$emit('delete', item)"
        />
      </div>
    </template>

    <!-- Forward custom column slots from the parent -->
    <template
      v-for="slotName in extraColumnSlots"
      :key="slotName"
      #[slotName]="scope"
    >
      <slot
        :name="slotName"
        v-bind="scope"
      />
    </template>

    <template #no-data>
      <slot name="empty">
        <div class="analysis-data-table__empty">
          <AtlasIcon
            size="48"
            class="analysis-data-table__empty-icon"
          >
            mdi-database-off-outline
          </AtlasIcon>
          <div class="analysis-data-table__empty-title">
            {{ emptyText ?? t('common.noData', 'No items yet.').value }}
          </div>
          <slot name="empty-action" />
        </div>
      </slot>
    </template>

    <template #loading>
      <AtlasSkeleton
        v-for="n in 5"
        :key="n"
        type="table-row"
        class="analysis-data-table__skeleton"
      />
    </template>
  </AtlasDataTable>
</template>

<script setup lang="ts" generic="T extends { id?: number }">
import { AtlasDataTable, AtlasIcon, AtlasIconButton, AtlasSkeleton } from '@/components/ui'
import { computed, useSlots } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { formatDate, formatRelativeTime } from '@/utils/date-format'
import { tagColor, tagContrastColor } from '@/utils/tag-color'

interface Tag { id?: number; name: string; color?: string }

interface Props {
  headers: { title: string; key: string; sortable?: boolean }[]
  items: T[]
  loading?: boolean
  itemsPerPage?: number
  sortBy?: { key: string; order: 'asc' | 'desc' }[]
  nameKey?: string
  enableCopy?: boolean
  emptyText?: string
  testid?: string
  maxVisibleTags?: number
  descriptionLimit?: number
  /**
   * Optional permission callbacks. Each receives the row item and returns
   * whether the action button should be enabled. Defaulting to `true` keeps
   * existing call sites that don't gate actions working unchanged.
   */
  canCopyItem?: (item: T) => boolean
  canDeleteItem?: (item: T) => boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  itemsPerPage: 25,
  sortBy: () => [{ key: 'modifiedDate', order: 'desc' }],
  nameKey: 'name',
  enableCopy: true,
  emptyText: undefined,
  testid: undefined,
  maxVisibleTags: 2,
  descriptionLimit: 80,
  canCopyItem: () => () => true,
  canDeleteItem: () => () => true,
})

defineEmits<{
  (e: 'open', item: T): void
  (e: 'copy', item: T): void
  (e: 'delete', item: T): void
}>()

const { t } = useI18n()
const slots = useSlots()

// Forward any item.<key> or other custom slots that the consumer passed
// in but that we don't render ourselves.
const RESERVED_SLOTS = new Set<string>([
  `item.${props.nameKey}`,
  'item.description',
  'item.modifiedDate',
  'item.createdDate',
  'item.createdBy',
  'item.actions',
  'no-data',
  'loading',
  'empty',
  'empty-action',
])
const extraColumnSlots = computed(() =>
  Object.keys(slots).filter(name => !RESERVED_SLOTS.has(name))
)

function getName(item: T): string {
  const v = (item as Record<string, unknown>)[props.nameKey]
  return typeof v === 'string' ? v : ''
}

function tagsOf(item: T): Tag[] {
  const v = (item as Record<string, unknown>).tags
  return Array.isArray(v) ? (v as Tag[]) : []
}

function hasTags(item: T): boolean {
  return tagsOf(item).length > 0
}

function visibleTags(item: T): Tag[] {
  return tagsOf(item).slice(0, props.maxVisibleTags)
}

function overflowTagCount(item: T): number {
  return Math.max(0, tagsOf(item).length - props.maxVisibleTags)
}

function overflowTagsTitle(item: T): string {
  return tagsOf(item)
    .slice(props.maxVisibleTags)
    .map(t => t.name)
    .join(', ')
}

function truncate(value: string | undefined): string {
  if (!value) return '—'
  if (value.length <= props.descriptionLimit) return value
  return `${value.slice(0, props.descriptionLimit)}…`
}

function strField(item: T, key: string): string | undefined {
  const v = (item as Record<string, unknown>)[key]
  return typeof v === 'string' ? v : undefined
}

function dateField(item: T, key: string): string | number | undefined {
  const v = (item as Record<string, unknown>)[key]
  return typeof v === 'string' || typeof v === 'number' ? v : undefined
}

function formatUser(user: unknown): string {
  if (!user) return '—'
  if (typeof user === 'string') return user
  const u = user as { name?: string; login?: string }
  return u.name ?? u.login ?? '—'
}
</script>

<style scoped>
.analysis-data-table {
  background: transparent;
}

.analysis-data-table :deep(thead th) {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.analysis-data-table :deep(tbody tr) {
  transition: background-color 120ms ease;
}

.analysis-data-table :deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-on-surface), 0.025);
}

.analysis-data-table :deep(tbody tr:hover) .analysis-data-table__row-actions {
  opacity: 1;
}

.analysis-data-table__name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.analysis-data-table__name-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  font-weight: 500;
}

.analysis-data-table__name-link:hover {
  text-decoration: underline;
}

.analysis-data-table__tag-rail {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.analysis-data-table__tag {
  font-size: 0.7rem;
  height: 20px;
}

.analysis-data-table__tag-overflow {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.analysis-data-table__description {
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.analysis-data-table__row-actions {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
  opacity: 0.5;
  transition: opacity 120ms ease;
}

.analysis-data-table__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 24px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.analysis-data-table__empty-icon {
  color: rgba(var(--v-theme-on-surface), 0.25);
}

.analysis-data-table__empty-title {
  font-size: 0.95rem;
  font-weight: 500;
}

.analysis-data-table__skeleton :deep(.v-skeleton-loader__bone) {
  margin: 8px 16px;
}
</style>
