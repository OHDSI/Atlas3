<template>
  <div class="generate-popover">
    <AtlasSelect
      :model-value="selectedSource"
      :items="sourceItems"
      item-title="sourceName"
      item-value="sourceKey"
      :label="t('profiles.selectADataSource', 'Data source').value"
      variant="outlined"
      hide-details
      class="mb-2"
      @update:model-value="(v) => (selectedSource = v as string | null)"
    />

    <div class="generate-popover__actions">
      <AtlasButton
        data-testid="generate-btn"
        size="sm"
        :disabled="
          !canGenerate ||
            !selectedSource ||
            generation.polling.value ||
            !canGenerateForSource(selectedSource)
        "
        @click="onStart"
      >
        {{ t('components.generation.generate', 'Generate') }}
      </AtlasButton>
      <AtlasButton
        variant="ghost"
        size="sm"
        :disabled="!generation.polling.value || !canCancelForSource(selectedSource)"
        @click="onCancel"
      >
        {{ t('common.cancel', 'Cancel') }}
      </AtlasButton>
    </div>

    <div
      v-if="generation.execution.value"
      class="generate-popover__status"
    >
      {{ t('columns.status', 'Status:') }} {{ generation.execution.value.status }}
    </div>
    <AtlasAlert
      v-if="generation.error.value"
      severity="danger"
      density="compact"
      class="mb-0"
    >
      {{ generation.error.value }}
    </AtlasAlert>
  </div>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasSelect } from '@/components/ui'
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePathwayStore } from '@/stores/pathway'
import { useDataSourcesStore } from '@/stores/datasources'
import { usePathwayGeneration } from '@/composables/usePathwayGeneration'
import { usePermissions } from '@/composables/usePermissions'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{ pathwayId: number }>()
const emit = defineEmits<{ generated: [] }>()

const store = usePathwayStore()
const ds = useDataSourcesStore()
const { canGenerate } = storeToRefs(store)
const { hasPermission } = usePermissions()
const { t } = useI18n()

const selectedSource = ref<string | null>(null)
const generation = usePathwayGeneration(props.pathwayId)

const sourceItems = computed(() => ds.sources)

function canGenerateForSource(sourceKey: string | null): boolean {
  if (!sourceKey) return false
  const hasPathwayRead = hasPermission('read:pathway') || hasPermission('write:pathway')
  return hasPathwayRead && hasPermission('write:source')
}

function canCancelForSource(sourceKey: string | null): boolean {
  return canGenerateForSource(sourceKey)
}

onMounted(async () => {
  if (ds.sources.length === 0 && !ds.isLoading) {
    await ds.fetchDataSources()
  }
})

async function onStart() {
  if (!selectedSource.value) return
  const ok = await generation.start(selectedSource.value)
  if (ok) emit('generated')
}

async function onCancel() {
  if (!selectedSource.value) return
  await generation.cancel(selectedSource.value)
}
</script>

<style scoped>
.generate-popover {
  padding: 12px;
  min-width: 240px;
}
.generate-popover__actions {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.generate-popover__status {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  margin-bottom: 8px;
}
</style>
