<template>
  <div class="ir-gen">
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

    <div class="ir-gen__actions">
      <AtlasButton
        size="sm"
        :disabled="!selectedSource || generation.polling.value"
        data-testid="ir-generate-btn"
        @click="onStart"
      >
        {{ t('components.generation.generate', 'Generate').value }}
      </AtlasButton>
      <AtlasButton
        variant="ghost"
        size="sm"
        :disabled="!generation.polling.value"
        @click="onCancel"
      >
        {{ t('common.cancel', 'Cancel').value }}
      </AtlasButton>
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
import { useI18n } from '@/composables/useI18n'
import { useDataSourcesStore } from '@/stores/datasources'
import { useIncidenceRateGeneration } from '@/composables/useIncidenceRateGeneration'

const props = defineProps<{ irId: number }>()
const emit = defineEmits<{ generated: [] }>()

const { t } = useI18n()
const ds = useDataSourcesStore()
const generation = useIncidenceRateGeneration(props.irId)

const selectedSource = ref<string | null>(null)
const sourceItems = computed(() => ds.sources)

onMounted(async () => {
  if (ds.sources.length === 0 && !ds.isLoading) await ds.fetchDataSources()
})

async function onStart() {
  if (!selectedSource.value) return
  const ok = await generation.start(selectedSource.value)
  if (ok) emit('generated')
}
async function onCancel() {
  if (selectedSource.value) await generation.cancel(selectedSource.value)
}
</script>

<style scoped>
.ir-gen { padding: 12px; min-width: 240px; }
.ir-gen__actions { display: flex; gap: 8px; margin-bottom: 8px; }
</style>
