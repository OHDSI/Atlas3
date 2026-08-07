<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/utils/logger'
import { AtlasAlert, AtlasDialog, AtlasProgressLinear, AtlasSpacer } from '@/components/ui'
import { listCacheFiles, deleteCacheFile, type CacheFile } from '@/services/trexsql.service'

const { t } = useI18n()

const files = ref<CacheFile[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const deleting = ref<string | null>(null)
const confirming = ref<CacheFile | null>(null)

const totalBytes = computed(() => files.value.reduce((sum, f) => sum + (f.sizeBytes || 0), 0))
const orphanCount = computed(() => files.value.filter(f => f.orphaned).length)
const orphanBytes = computed(() =>
  files.value.filter(f => f.orphaned).reduce((sum, f) => sum + (f.sizeBytes || 0), 0)
)

function formatBytes(bytes: number | null): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

function formatDate(ms: number | null): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleString()
}

async function load() {
  loading.value = true
  error.value = null
  try {
    files.value = await listCacheFiles()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    logger.error('CacheFiles', 'Failed to list cache files', err)
  } finally {
    loading.value = false
  }
}

async function confirmDelete() {
  const target = confirming.value
  if (!target) return
  confirming.value = null
  deleting.value = target.databaseCode
  try {
    await deleteCacheFile(target.databaseCode)
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    logger.error('CacheFiles', `Failed to delete ${target.databaseCode}`, err)
  } finally {
    deleting.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="cache-files-section">
    <v-card>
      <v-card-title class="d-flex align-center">
        <AtlasIcon
          start
          color="primary"
        >
          mdi-database-cog
        </AtlasIcon>
        {{ t('trexsql.cacheFilesTitle', 'Cache files on disk') }}
        <AtlasSpacer />
        <AtlasButton
          variant="ghost"
          :loading="loading"
          data-testid="cache-files-refresh"
          @click="load"
        >
          {{ t('common.refresh', 'Refresh') }}
        </AtlasButton>
      </v-card-title>

      <v-card-text>
        <p class="text-body-2 mb-4">
          {{
            t(
              'trexsql.cacheFilesDescription',
              'Every cache on disk, including caches whose dataset has been deleted. Those are no longer reachable from the dataset list and can be reclaimed here.'
            )
          }}
        </p>

        <AtlasAlert
          v-if="error"
          severity="danger"
          class="mb-4"
          data-testid="cache-files-error"
        >
          {{ error }}
        </AtlasAlert>

        <div
          v-if="files.length"
          class="summary mb-3"
          data-testid="cache-files-summary"
        >
          <span>{{ files.length }} {{ t('trexsql.cacheFilesCount', 'files') }}</span>
          <span>{{ formatBytes(totalBytes) }}</span>
          <span v-if="orphanCount">
            {{ orphanCount }}
            {{ t('trexsql.cacheFilesOrphaned', 'orphaned') }}
            ({{ formatBytes(orphanBytes) }})
          </span>
        </div>

        <AtlasProgressLinear
          v-if="loading && !files.length"
          indeterminate
        />

        <v-table
          v-else-if="files.length"
          density="compact"
          data-testid="cache-files-table"
        >
          <thead>
            <tr>
              <th>{{ t('trexsql.cacheFileName', 'Cache') }}</th>
              <th class="text-right">
                {{ t('trexsql.cacheFileSize', 'Size') }}
              </th>
              <th>{{ t('trexsql.cacheFileModified', 'Last modified') }}</th>
              <th>{{ t('common.status', 'Status') }}</th>
              <th class="text-right">
                {{ t('common.actions', 'Actions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="file in files"
              :key="file.fileName"
              :data-testid="`cache-file-${file.databaseCode}`"
            >
              <td class="mono">
                {{ file.databaseCode }}
              </td>
              <td class="text-right">
                {{ formatBytes(file.sizeBytes) }}
              </td>
              <td>{{ formatDate(file.lastModified) }}</td>
              <td>
                <AtlasChip
                  v-if="file.protected"
                  size="sm"
                  tone="default"
                >
                  {{ t('trexsql.cacheFileProtected', 'System') }}
                </AtlasChip>
                <AtlasChip
                  v-else-if="file.orphaned"
                  size="sm"
                  tone="warning"
                >
                  {{ t('trexsql.cacheFileOrphaned', 'No dataset') }}
                </AtlasChip>
                <AtlasChip
                  v-else-if="file.attached"
                  size="sm"
                  tone="primary"
                >
                  {{ t('trexsql.cacheFileAttached', 'Attached') }}
                </AtlasChip>
                <span v-else>—</span>
              </td>
              <td class="text-right">
                <AtlasButton
                  variant="ghost"
                  tone="danger"
                  size="sm"
                  :disabled="file.protected"
                  :loading="deleting === file.databaseCode"
                  :data-testid="`cache-file-delete-${file.databaseCode}`"
                  @click="confirming = file"
                >
                  {{ t('common.delete', 'Delete') }}
                </AtlasButton>
              </td>
            </tr>
          </tbody>
        </v-table>

        <p
          v-else-if="!loading"
          class="text-body-2"
        >
          {{ t('trexsql.cacheFilesEmpty', 'No cache files found.') }}
        </p>
      </v-card-text>
    </v-card>

    <AtlasDialog
      :model-value="confirming !== null"
      :title="t('trexsql.cacheFileDeleteTitle', 'Delete cache?').value"
      max-width="480"
      @update:model-value="confirming = null"
    >
      <template v-if="confirming">
        <p class="mb-2">
          <span class="mono">{{ confirming.databaseCode }}</span>
          &mdash; {{ formatBytes(confirming.sizeBytes) }}
        </p>
        <p class="text-body-2">
          {{
            confirming.orphaned
              ? t(
                'trexsql.cacheFileDeleteOrphan',
                'No dataset references this cache. Deleting it frees the space and cannot be undone.'
              )
              : t(
                'trexsql.cacheFileDeleteActive',
                'This cache belongs to a dataset that is still registered. It will have to be rebuilt before that dataset can be queried again.'
              )
          }}
        </p>
      </template>
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="confirming = null"
        >
          {{ t('common.cancel', 'Cancel') }}
        </AtlasButton>
        <AtlasButton
          tone="danger"
          data-testid="cache-file-delete-confirm"
          @click="confirmDelete"
        >
          {{ t('common.delete', 'Delete') }}
        </AtlasButton>
      </template>
    </AtlasDialog>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
</style>
