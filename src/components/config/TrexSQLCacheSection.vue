<template>
  <div
    v-if="isTrexSQLEnabled"
    class="trexsql-cache-section"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        {{ t('trexsql.cacheTitle', 'Patient Cache') }}
      </v-card-title>

      <v-card-text>
        <p class="text-body-1 mb-4">
          {{
            t(
              'trexsql.cacheDescription',
              'Build and manage patient caches for fast cohort counting. Each data source can have its own cache.'
            )
          }}
        </p>

        <div
          v-if="isLoading"
          class="d-flex align-center justify-center py-8"
        >
          <AtlasProgressCircular
            indeterminate
            color="primary"
          />
          <span class="ml-3">{{ t('common.loading', 'Loading...') }}</span>
        </div>

        <AtlasList
          v-else
          lines="two"
          class="trexsql-cache-section__list"
        >
          <AtlasListItem
            v-for="row in cacheRows"
            :key="row.key"
            class="trexsql-cache-section__item"
            :data-testid="`cache-row-${row.databaseCode}`"
          >
            <template #prepend>
              <AtlasAvatar
                :color="getStatusColor(row)"
                size="40"
              >
                <AtlasIcon color="white">
                  {{ getStatusIcon(row) }}
                </AtlasIcon>
              </AtlasAvatar>
            </template>

            <v-list-item-title class="font-weight-medium">
              {{ row.title }}
            </v-list-item-title>

            <v-list-item-subtitle>
              <div class="d-flex align-center flex-wrap gap-2">
                <AtlasChip
                  :color="getStatusColor(row)"
                  size="sm"
                  variant="tonal"
                >
                  {{ getStatusLabel(row) }}
                </AtlasChip>

                <AtlasChip
                  v-if="!row.hasSource"
                  color="warning"
                  size="sm"
                  variant="tonal"
                  data-testid="cache-row-orphan"
                >
                  {{ t('trexsql.cacheFileOrphaned', 'No dataset') }}
                </AtlasChip>

                <template v-if="row.cacheStatus?.status === 'ready' || row.cacheStatus?.status === 'stale'">
                  <span
                    v-if="row.cacheStatus?.totalPatientCount"
                    class="text-body-2 text-grey-darken-1"
                  >
                    {{ formatNumber(row.cacheStatus.totalPatientCount) }} patients
                  </span>
                </template>

                <span
                  v-if="rowSizeBytes(row)"
                  class="text-body-2 text-grey"
                >
                  {{ formatBytes(rowSizeBytes(row) as number) }}
                </span>

                <span
                  v-if="row.cacheStatus?.lastBuiltAt"
                  class="text-caption text-grey"
                >
                  {{ t('trexsql.lastBuilt', 'Built') }}:
                  {{ formatDate(row.cacheStatus.lastBuiltAt) }}
                </span>
                <span
                  v-else-if="row.file?.lastModified"
                  class="text-caption text-grey"
                >
                  {{ t('trexsql.lastBuilt', 'Built') }}:
                  {{ formatDate(new Date(row.file.lastModified).toISOString()) }}
                </span>

                <span
                  v-if="row.cacheStatus?.status === 'error' && row.cacheStatus?.errorMessage"
                  class="text-caption text-error"
                >
                  {{ row.cacheStatus.errorMessage }}
                </span>
              </div>
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex align-center gap-2">
                <div
                  v-if="row.cacheStatus?.status === 'building'"
                  class="d-flex align-center"
                >
                  <AtlasProgressCircular
                    indeterminate
                    size="24"
                    width="2"
                    color="info"
                  />
                  <span class="ml-2 text-body-2 text-info">
                    {{ t('trexsql.building', 'Building...') }}
                  </span>
                </div>

                <template v-else>
                  <AtlasButton
                    v-if="row.hasSource"
                    :variant="row.cacheStatus?.status === 'ready' ? 'secondary' : 'primary'"
                    :tone="row.cacheStatus?.status === 'ready' ? 'primary' : 'success'"
                    size="sm"
                    icon="mdi-refresh"
                    :loading="buildingSource === row.sourceKey"
                    :disabled="buildingSource !== null"
                    :data-testid="`cache-update-${row.databaseCode}`"
                    @click="handleBuildCache(row.sourceKey as string)"
                  >
                    {{ updateLabel(row) }}
                  </AtlasButton>

                  <AtlasButton
                    variant="ghost"
                    tone="danger"
                    size="sm"
                    icon="mdi-trash-can-outline"
                    :loading="deleting === row.databaseCode"
                    :disabled="buildingSource !== null || deleting !== null"
                    :data-testid="`cache-delete-${row.databaseCode}`"
                    @click="confirming = row"
                  >
                    {{ t('common.delete', 'Delete') }}
                  </AtlasButton>
                </template>
              </div>
            </template>
          </AtlasListItem>

          <AtlasListItem v-if="cacheRows.length === 0">
            <v-list-item-title class="text-grey">
              {{ t('trexsql.noDataSources', 'No data sources available') }}
            </v-list-item-title>
          </AtlasListItem>
        </AtlasList>
      </v-card-text>
    </v-card>

    <AtlasDialog
      :model-value="confirming !== null"
      :title="t('trexsql.cacheFileDeleteTitle', 'Delete cache?').value"
      max-width="520"
      @update:model-value="v => { if (!v) confirming = null }"
    >
      <p v-if="confirming">
        {{
          confirming.hasSource
            ? t(
              'trexsql.cacheFileDeleteActive',
              'This cache is in use by a data source. Cohort counts will be slow until it is rebuilt.'
            )
            : t(
              'trexsql.cacheFileDeleteOrphan',
              'This cache has no data source. Deleting it reclaims the disk space.'
            )
        }}
      </p>

      <template #actions>
        <AtlasButton
          variant="ghost"
          data-testid="cache-delete-cancel"
          @click="confirming = null"
        >
          {{ t('common.cancel', 'Cancel') }}
        </AtlasButton>
        <AtlasButton
          variant="primary"
          tone="danger"
          data-testid="cache-delete-confirm"
          @click="handleDelete"
        >
          {{ t('common.delete', 'Delete') }}
        </AtlasButton>
      </template>
    </AtlasDialog>

    <AtlasSnackbar
      v-model="showToast"
      :severity="toastSeverity"
      :text="toastMessage"
      :timeout="5000"
      location="bottom"
    />
  </div>
</template>

<script setup lang="ts">
import {
  AtlasAvatar,
  AtlasButton,
  AtlasChip,
  AtlasDialog,
  AtlasIcon,
  AtlasList,
  AtlasListItem,
  AtlasProgressCircular,
  AtlasSnackbar,
} from '@/components/ui'
import type { AtlasSnackbarSeverity } from '@/components/ui'
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useAuth } from '@/composables/useAuth'
import { useTrexSQLCache } from '@/composables/useTrexSQLCache'
import { logger } from '@/utils/logger'
import { listDataSources } from '@/services/datasource.service'
import {
  getCacheStatus,
  buildCache,
  listCacheFiles,
  deleteCacheFile,
  type CacheFile,
} from '@/services/trexsql.service'
import type { CacheStatusType, TrexSQLCacheStatus } from '@/models/trexsql.types'
import type { DataSource } from '@/models/datasource.types'

interface CacheRow {
  key: string
  databaseCode: string
  title: string
  sourceKey: string | null
  cacheStatus: TrexSQLCacheStatus | null
  file: CacheFile | null
  hasSource: boolean
}

const { t, tv } = useI18n()
const auth = useAuth()
const { isTrexSQLEnabled, initialize: initTrexSQL } = useTrexSQLCache()

const isLoading = ref(false)
const rows = ref<CacheRow[]>([])
const dataSourcesInfo = ref<Map<string, DataSource>>(new Map())
const buildingSource = ref<string | null>(null)
const deleting = ref<string | null>(null)
const confirming = ref<CacheRow | null>(null)
const showToast = ref(false)
const toastMessage = ref('')
const toastSeverity = ref<AtlasSnackbarSeverity>('success')

const cacheRows = computed(() =>
  [...rows.value].sort((a, b) => {
    const rank = (r: CacheRow) => (r.hasSource ? 0 : 1)
    return rank(a) - rank(b) || a.title.localeCompare(b.title)
  })
)

async function loadCaches(): Promise<void> {
  if (!isTrexSQLEnabled.value) return

  isLoading.value = true

  try {
    const sources = await listDataSources()

    const infoMap = new Map<string, DataSource>()
    sources.forEach(source => infoMap.set(source.sourceKey, source))
    dataSourcesInfo.value = infoMap

    let files: CacheFile[] = []
    try {
      files = (await listCacheFiles()).filter(f => !f.protected)
    } catch (error) {
      logger.warn('TrexSQLCacheSection', 'Failed to list cache files', error)
    }

    const statuses = await Promise.all(
      sources.map(async source => {
        try {
          return await getCacheStatus(source.sourceKey)
        } catch (error) {
          logger.warn(
            'TrexSQLCacheSection',
            `Failed to get cache status for ${source.sourceKey}`,
            error
          )
          return null
        }
      })
    )

    const fileByCode = new Map(files.map(f => [f.databaseCode.toLowerCase(), f]))
    const claimed = new Set<string>()

    const sourceRows: CacheRow[] = sources.map((source, i) => {
      const code = source.sourceKey
      const file = fileByCode.get(code.toLowerCase()) ?? null
      if (file) claimed.add(file.databaseCode.toLowerCase())
      return {
        key: `source:${source.sourceKey}`,
        databaseCode: file?.databaseCode ?? code,
        title: source.sourceName,
        sourceKey: source.sourceKey,
        cacheStatus: statuses[i] ?? null,
        file,
        hasSource: true,
      }
    })

    const orphanRows: CacheRow[] = files
      .filter(f => !claimed.has(f.databaseCode.toLowerCase()))
      .map(f => ({
        key: `file:${f.fileName}`,
        databaseCode: f.databaseCode,
        title: f.databaseCode,
        sourceKey: null,
        cacheStatus: null,
        file: f,
        hasSource: false,
      }))

    rows.value = [...sourceRows, ...orphanRows]
  } catch (error) {
    logger.error('TrexSQLCacheSection', 'Failed to load caches', error)
    showNotification(tv('components.config.trexsql.loadError', 'Failed to load data sources'), 'error')
  } finally {
    isLoading.value = false
  }
}

function rowSizeBytes(row: CacheRow): number | null {
  return row.cacheStatus?.sizeBytes ?? row.file?.sizeBytes ?? null
}

function updateLabel(row: CacheRow): string {
  const status = row.cacheStatus?.status
  return status === 'ready' || status === 'stale'
    ? t('trexsql.update', 'Update').value
    : t('trexsql.build', 'Build Cache').value
}

function getCdmSchemaName(sourceKey: string): string | undefined {
  const source = dataSourcesInfo.value.get(sourceKey)
  if (!source) return undefined
  const cdmDaimon = source.daimons.find(d => d.daimonType === 'CDM')
  return cdmDaimon?.tableQualifier
}

async function handleBuildCache(sourceKey: string): Promise<void> {
  buildingSource.value = sourceKey

  try {
    const schemaName = getCdmSchemaName(sourceKey)
    const response = await buildCache(sourceKey, schemaName)

    const row = rows.value.find(r => r.sourceKey === sourceKey)
    if (row) {
      row.cacheStatus = {
        sourceKey,
        status: 'building',
        totalPatientCount: row.cacheStatus?.totalPatientCount ?? null,
        lastBuiltAt: row.cacheStatus?.lastBuiltAt ?? null,
        sizeBytes: row.cacheStatus?.sizeBytes ?? null,
        errorMessage: null,
      }
    }

    showNotification(
      response.message || tv('components.config.trexsql.buildStarted', 'Cache build started'),
      'success'
    )

    pollCacheStatus(sourceKey)
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : tv('components.config.trexsql.buildStartError', 'Failed to start cache build')
    showNotification(errorMessage, 'error')
    buildingSource.value = null
  }
}

async function handleDelete(): Promise<void> {
  const row = confirming.value
  if (!row) return

  confirming.value = null
  deleting.value = row.databaseCode

  try {
    await deleteCacheFile(row.databaseCode)
    await loadCaches()
    showNotification(tv('components.config.trexsql.deleteComplete', 'Cache deleted'), 'success')
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : tv('components.config.trexsql.deleteFailed', 'Failed to delete cache')
    showNotification(errorMessage, 'error')
  } finally {
    deleting.value = null
  }
}

async function pollCacheStatus(sourceKey: string): Promise<void> {
  const maxPolls = 120 // 10 minutes max (5 second intervals)
  let pollCount = 0

  const poll = async () => {
    try {
      const status = await getCacheStatus(sourceKey)

      const row = rows.value.find(r => r.sourceKey === sourceKey)
      if (row) {
        row.cacheStatus = status
      }

      if (status.status === 'building' && pollCount < maxPolls) {
        pollCount++
        setTimeout(poll, 5000)
      } else {
        buildingSource.value = null

        if (status.status === 'ready') {
          showNotification(
            tv('components.config.trexsql.buildComplete', 'Cache build completed successfully'),
            'success'
          )
        } else if (status.status === 'error') {
          showNotification(
            status.errorMessage || tv('components.config.trexsql.buildFailed', 'Cache build failed'),
            'error'
          )
        }
      }
    } catch (error) {
      logger.error('TrexSQLCacheSection', 'Failed to poll cache status', error)
      buildingSource.value = null
    }
  }

  setTimeout(poll, 2000)
}

function showNotification(message: string, color: 'success' | 'error' | 'info'): void {
  toastMessage.value = message
  toastSeverity.value = color === 'error' ? 'danger' : color
  showToast.value = true
}

function effectiveStatus(row: CacheRow): CacheStatusType | undefined {
  if (row.cacheStatus?.status) return row.cacheStatus.status
  return row.file ? 'ready' : undefined
}

function getStatusColor(row: CacheRow): string {
  switch (effectiveStatus(row)) {
    case 'ready':
      return row.hasSource ? 'success' : 'warning'
    case 'building':
      return 'info'
    case 'stale':
      return 'warning'
    case 'error':
      return 'error'
    case 'not_built':
    default:
      return 'grey'
  }
}

function getStatusIcon(row: CacheRow): string {
  switch (effectiveStatus(row)) {
    case 'ready':
      return 'mdi-check-circle'
    case 'building':
      return 'mdi-cog'
    case 'stale':
      return 'mdi-clock-alert'
    case 'error':
      return 'mdi-alert-circle'
    case 'not_built':
    default:
      return 'mdi-database-off'
  }
}

function getStatusLabel(row: CacheRow): string {
  switch (effectiveStatus(row)) {
    case 'ready':
      return t('trexsql.statusReady', 'Ready').value
    case 'building':
      return t('trexsql.statusBuilding', 'Building').value
    case 'stale':
      return t('trexsql.statusStale', 'Stale').value
    case 'error':
      return t('trexsql.statusError', 'Error').value
    case 'not_built':
    default:
      return t('trexsql.statusNotBuilt', 'Not Built').value
  }
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

onMounted(async () => {
  await initTrexSQL()
  loadCaches()
})

watch(
  () => auth.isAuthenticated.value,
  async (isAuth, wasAuth) => {
    if (isAuth && !wasAuth) {
      await initTrexSQL()
      loadCaches()
    }
  }
)
</script>

<style scoped>
.trexsql-cache-section {
  max-width: 800px;
  margin-top: 24px;
}

.trexsql-cache-section__list {
  background: transparent;
}

.trexsql-cache-section__item {
  border: 1px solid var(--atlas-color-outline);
  border-radius: 8px;
  margin-bottom: 12px;
  background: var(--atlas-color-surface-variant);
}

.trexsql-cache-section__item:last-child {
  margin-bottom: 0;
}

.gap-2 {
  gap: 8px;
}
</style>
