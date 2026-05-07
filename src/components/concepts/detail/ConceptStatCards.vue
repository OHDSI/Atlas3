<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useDataSourcesStore } from '@/stores/datasources'
import { useConceptDetailStore } from '@/stores/concept-detail'
import type { ConceptRecordCount } from '@/models/concept-detail.types'

const props = defineProps<{
  conceptId: number
  primarySourceKey: string
  countsBySource: Map<string, ConceptRecordCount>
}>()

const dataSources = useDataSourcesStore()
const conceptDetail = useConceptDetailStore()

const sourcesList = computed(() => dataSources.sources ?? [])

function formatCount(n: number | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return n.toLocaleString('en-US')
  return String(n)
}

function formatPercent(persons: number | undefined): string {
  if (persons == null || persons === 0) return '—'
  return persons.toLocaleString('en-US')
}

async function ensureCounts() {
  const others = sourcesList.value
    .map((s) => s.sourceKey)
    .filter((k) => k !== props.primarySourceKey)
  if (others.length > 0) {
    await conceptDetail.loadRecordCountsForSources(others, props.conceptId)
  }
}

onMounted(ensureCounts)
watch(() => [props.conceptId, props.primarySourceKey], ensureCounts)
</script>

<template>
  <section
    class="stat-grid"
    data-testid="concept-stat-cards"
  >
    <v-card
      v-for="source in sourcesList"
      :key="source.sourceKey"
      :data-testid="`stat-card-${source.sourceKey}`"
      density="compact"
      variant="outlined"
      class="stat-card"
    >
      <div class="stat-source">{{ source.sourceName }}</div>
      <div class="stat-big">
        {{ formatCount(countsBySource.get(source.sourceKey)?.recordCount) }}
      </div>
      <div class="stat-sub">
        {{ formatPercent(countsBySource.get(source.sourceKey)?.personCount) }} persons ·
        {{ formatCount(countsBySource.get(source.sourceKey)?.descendantRecordCount) }} desc.
      </div>
    </v-card>
  </section>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.stat-card {
  padding: 12px;
}
.stat-source {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 4px;
}
.stat-big {
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.stat-sub {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.6);
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}
</style>
