<template>
  <div class="pathway-gen-panel">
    <h3>Generation</h3>
    <v-select
      :model-value="selectedSource"
      :items="sourceItems"
      item-title="sourceName"
      item-value="sourceKey"
      label="Data source"
      density="compact"
      hide-details
      @update:model-value="(v: string | null) => selectedSource = v ?? null"
    />
    <div class="actions">
      <v-btn
        data-testid="generate-btn"
        color="primary"
        :disabled="!canGenerate || !selectedSource || generation.polling.value"
        @click="onStart"
      >Generate</v-btn>
      <v-btn
        :disabled="!generation.polling.value"
        @click="onCancel"
      >Cancel</v-btn>
    </div>

    <div
      v-if="generation.execution.value"
      class="status"
    >
      Status: {{ generation.execution.value.status }}
    </div>
    <div
      v-if="generation.error.value"
      class="error"
    >
      {{ generation.error.value }}
    </div>

    <h4>Past executions</h4>
    <v-table density="compact">
      <thead>
        <tr>
          <th>Source</th>
          <th>Status</th>
          <th>Date</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="e in executions"
          :key="e.id"
        >
          <td>{{ e.sourceKey }}</td>
          <td>{{ e.status }}</td>
          <td>{{ e.executionDate }}</td>
          <td>
            <router-link
              v-if="e.status === 'COMPLETED'"
              :to="`/pathways/${pathwayId}/results/${e.id}`"
            >View</router-link>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePathwayStore } from '@/stores/pathway'
import { useDataSourcesStore } from '@/stores/datasources'
import { usePathwayGeneration } from '@/composables/usePathwayGeneration'
import { listPathwayExecutions } from '@/services/webapi'
import type { PathwayExecution } from '@/models/pathway.types'

const props = defineProps<{ pathwayId: number }>()
const store = usePathwayStore()
const ds = useDataSourcesStore()
const { canGenerate } = storeToRefs(store)

const selectedSource = ref<string | null>(null)
const executions = ref<PathwayExecution[]>([])
const generation = usePathwayGeneration(props.pathwayId)

const sourceItems = computed(() => ds.sources)

async function refreshExecutions() {
  const r = await listPathwayExecutions(props.pathwayId)
  if (r.success) executions.value = r.data
}

onMounted(refreshExecutions)

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
</script>

<style scoped>
.pathway-gen-panel { padding: 8px; border: 1px solid #eee; border-radius: 4px; }
.actions { display: flex; gap: 8px; margin: 8px 0; }
.status { font-size: 0.9em; color: #555; }
.error { color: #c00; margin: 8px 0; }
</style>
