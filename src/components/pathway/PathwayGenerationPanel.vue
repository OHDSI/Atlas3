<template>
  <div class="pathway-gen-panel">
    <header class="pathway-gen-panel__header">
      <span class="text-eyebrow">{{ t('cohortDefinitions.cohortDefinitionManager.tabs.generation', 'Generation').value }}</span>
      <span class="pathway-gen-panel__rule" />
    </header>

    <v-select
      :model-value="selectedSource"
      :items="sourceItems"
      item-title="sourceName"
      item-value="sourceKey"
      :label="t('profiles.selectADataSource', 'Data source').value"
      density="compact"
      variant="outlined"
      hide-details
      class="mb-2"
      @update:model-value="(v: string | null) => selectedSource = v ?? null"
    />

    <div class="pathway-gen-panel__actions">
      <v-btn
        data-testid="generate-btn"
        color="primary"
        size="small"
        variant="flat"
        :disabled="!canGenerate || !selectedSource || generation.polling.value || !canGenerateForSource(selectedSource)"
        @click="onStart"
      >
        {{ t('components.generation.generate', 'Generate') }}
      </v-btn>
      <v-btn
        size="small"
        variant="text"
        :disabled="!generation.polling.value || !canCancelForSource(selectedSource)"
        @click="onCancel"
      >
        {{ t('common.cancel', 'Cancel') }}
      </v-btn>
    </div>

    <div
      v-if="generation.execution.value"
      class="pathway-gen-panel__status"
    >
      {{ t('columns.status', 'Status:') }} {{ generation.execution.value.status }}
    </div>
    <v-alert
      v-if="generation.error.value"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-2"
    >
      {{ generation.error.value }}
    </v-alert>

    <header class="pathway-gen-panel__header pathway-gen-panel__header--past">
      <span class="text-eyebrow">{{ t('components.analysisExecution.buttons.allExecutions', 'Past executions ({submissions})', { submissions: executions.length }).value }}</span>
      <span class="pathway-gen-panel__rule" />
    </header>

    <div
      v-if="executions.length === 0"
      class="pathway-gen-panel__empty"
    >
      {{ t('common.noData', 'None yet').value }}
    </div>

    <ul
      v-else
      class="pathway-gen-panel__list"
    >
      <li
        v-for="e in executions"
        :key="e.id"
        class="pathway-gen-panel__item"
      >
        <div class="pathway-gen-panel__item-row">
          <span class="pathway-gen-panel__item-source">{{ e.sourceKey }}</span>
          <span :class="['pathway-gen-panel__item-status', `pathway-gen-panel__item-status--${e.status.toLowerCase()}`]">
            {{ e.status }}
          </span>
        </div>
        <div class="pathway-gen-panel__item-row pathway-gen-panel__item-row--meta">
          <span class="pathway-gen-panel__item-date">{{ formatDate(e.executionDate) }}</span>
          <a
            v-if="e.status === 'COMPLETED'"
            href="#"
            class="pathway-gen-panel__item-link"
            data-testid="pathway-execution-view"
            @click.prevent="$emit('select', e.id)"
          >
            {{ t('common.view', 'View').value }}
          </a>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePathwayStore } from '@/stores/pathway'
import { useDataSourcesStore } from '@/stores/datasources'
import { usePathwayGeneration } from '@/composables/usePathwayGeneration'
import { usePermissions } from '@/composables/usePermissions'
import { listPathwayExecutions } from '@/services/webapi'
import type { PathwayExecution } from '@/models/pathway.types'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{ pathwayId: number }>()
defineEmits<{ select: [executionId: number] }>()
const store = usePathwayStore()
const ds = useDataSourcesStore()
const { canGenerate } = storeToRefs(store)
const { hasPermission } = usePermissions()

// Mirrors the server's @PreAuthorize on
// POST /pathway-analysis/{id}/generation/{sourceKey}:
//   (read:pathway OR write:pathway) AND write:source
function canGenerateForSource(sourceKey: string | null): boolean {
  if (!sourceKey) return false
  const hasPathwayRead = hasPermission('read:pathway') || hasPermission('write:pathway')
  return hasPathwayRead && hasPermission('write:source')
}

function canCancelForSource(sourceKey: string | null): boolean {
  if (!sourceKey) return false
  const hasPathwayRead = hasPermission('read:pathway') || hasPermission('write:pathway')
  return hasPathwayRead && hasPermission('write:source')
}

const selectedSource = ref<string | null>(null)
const executions = ref<PathwayExecution[]>([])
const generation = usePathwayGeneration(props.pathwayId)
const { t } = useI18n()

const sourceItems = computed(() => ds.sources)

async function refreshExecutions() {
  const r = await listPathwayExecutions(props.pathwayId)
  if (r.success) executions.value = r.data
}

onMounted(async () => {
  if (ds.sources.length === 0 && !ds.isLoading) {
    await ds.fetchDataSources()
  }
  await refreshExecutions()
})

async function onStart() {
  if (!selectedSource.value) return
  const ok = await generation.start(selectedSource.value)
  if (ok) await refreshExecutions()
}

async function onCancel() {
  if (!selectedSource.value) return
  await generation.cancel(selectedSource.value)
  await refreshExecutions()
}

function formatDate(value: string | number | undefined | null): string {
  if (value === null || value === undefined || value === '') return '—'
  const d = typeof value === 'number' ? new Date(value) : new Date(String(value))
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}
</script>

<style scoped>
.pathway-gen-panel {
  padding: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
  overflow: hidden;
}
.pathway-gen-panel__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.pathway-gen-panel__header--past {
  margin-top: 14px;
}
.pathway-gen-panel__rule {
  flex: 1;
  height: 1px;
  background-color: rgba(var(--v-theme-on-surface), 0.08);
}
.pathway-gen-panel__actions {
  display: flex;
  gap: 8px;
  margin: 4px 0 8px;
}
.pathway-gen-panel__status {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-bottom: 8px;
}
.pathway-gen-panel__empty {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  padding: 8px 0;
}
.pathway-gen-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.pathway-gen-panel__item {
  padding: 8px 0;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}
.pathway-gen-panel__item:first-child {
  border-top: none;
}
.pathway-gen-panel__item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.pathway-gen-panel__item-row--meta {
  margin-top: 2px;
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
}
.pathway-gen-panel__item-source {
  font-weight: 500;
  font-size: 13px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pathway-gen-panel__item-status {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface-variant));
}
.pathway-gen-panel__item-status--completed {
  background: rgba(76, 175, 80, 0.14);
  color: rgb(56, 142, 60);
}
.pathway-gen-panel__item-status--failed {
  background: rgba(var(--v-theme-error), 0.14);
  color: rgb(var(--v-theme-error));
}
.pathway-gen-panel__item-status--running,
.pathway-gen-panel__item-status--starting,
.pathway-gen-panel__item-status--started {
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
}
.pathway-gen-panel__item-date {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pathway-gen-panel__item-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  font-weight: 600;
  border-bottom: 1px solid transparent;
  transition: border-color 120ms ease;
}
.pathway-gen-panel__item-link:hover {
  border-bottom-color: currentColor;
}
.results-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 120ms ease;
}
.results-link:hover { border-bottom-color: currentColor; }
</style>
