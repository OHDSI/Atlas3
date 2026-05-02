<template>
  <div class="ir-gen">
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
      @update:model-value="(v: string | null) => (selectedSource = v ?? null)"
    />

    <div class="ir-gen__actions">
      <v-btn
        color="primary"
        size="small"
        variant="flat"
        :disabled="!selectedSource || generation.polling.value"
        data-testid="ir-generate-btn"
        @click="onStart"
      >
        {{ t('components.generation.generate', 'Generate').value }}
      </v-btn>
      <v-btn
        size="small"
        variant="text"
        :disabled="!generation.polling.value"
        @click="onCancel"
      >
        {{ t('common.cancel', 'Cancel').value }}
      </v-btn>
    </div>

    <v-alert
      v-if="generation.error.value"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-0"
    >
      {{ generation.error.value }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
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
