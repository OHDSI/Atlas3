<template>
  <div
    v-if="isTrexSQLEnabled"
    class="cache-preview-selector"
    data-testid="cache-preview-selector"
  >
    <span class="cache-preview-selector__label">
      {{ t('inclusionRail.livePreviewCache', 'Live preview cache').value }}
    </span>
    <AtlasSelect
      :model-value="selectedSourceKey"
      :items="items"
      :loading="isLoadingDataSources"
      item-title="text"
      item-value="value"
      hide-details
      variant="outlined"
      class="cache-preview-selector__select"
      @update:model-value="onChange"
    >
      <template #prepend-inner>
        <AtlasIcon
          size="small"
          color="grey-darken-1"
        >
          mdi-database
        </AtlasIcon>
      </template>
      <template #item="{ item, props: itemProps }">
        <AtlasListItem v-bind="itemProps">
          <template #append>
            <AtlasChip
              v-if="item.raw.statusLabel"
              size="sm"
              :tone="item.raw.statusTone"
              variant="tonal"
            >
              {{ item.raw.statusLabel }}
            </AtlasChip>
          </template>
        </AtlasListItem>
      </template>
    </AtlasSelect>
    <AtlasChip
      v-if="selectedStatus"
      size="sm"
      :tone="selectedStatus.tone"
      variant="tonal"
    >
      {{ selectedStatus.label }}
    </AtlasChip>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { AtlasChip, AtlasIcon, AtlasListItem, AtlasSelect } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useTrexSQLCache } from '@/composables/useTrexSQLCache'
import type { CacheStatusType } from '@/models/trexsql.types'

const { t } = useI18n()
const {
  isTrexSQLEnabled,
  selectedSourceKey,
  dataSources,
  isLoadingDataSources,
  selectDataSource,
  initialize,
} = useTrexSQLCache()

function statusLabel(status: CacheStatusType | undefined): string {
  switch (status) {
    case 'ready':     return t('trexsql.cacheReady', 'Ready').value
    case 'stale':     return t('trexsql.cacheStale', 'Stale').value
    case 'building':  return t('trexsql.cacheBuilding', 'Building').value
    case 'error':     return t('trexsql.cacheError', 'Error').value
    case 'not_built': return t('trexsql.cacheNotBuilt', 'Not built').value
    default:          return ''
  }
}

function statusTone(
  status: CacheStatusType | undefined
): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'ready':    return 'success'
    case 'stale':    return 'warning'
    case 'building': return 'info'
    case 'error':    return 'danger'
    default:         return 'neutral'
  }
}

const items = computed(() =>
  dataSources.value.map(s => ({
    text: s.sourceName,
    value: s.sourceKey,
    statusLabel: statusLabel(s.cacheStatus?.status),
    statusTone: statusTone(s.cacheStatus?.status),
  }))
)

const selectedStatus = computed(() => {
  const source = dataSources.value.find(s => s.sourceKey === selectedSourceKey.value)
  if (!source?.cacheStatus?.status) return null
  return {
    label: statusLabel(source.cacheStatus.status),
    tone: statusTone(source.cacheStatus.status),
  }
})

function onChange(value: string | null): void {
  if (value) selectDataSource(value)
}

onMounted(() => {
  void initialize()
})
</script>

<style scoped>
.cache-preview-selector {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.cache-preview-selector__label {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 600;
}

.cache-preview-selector__select {
  min-width: 200px;
  max-width: 240px;
}
</style>
