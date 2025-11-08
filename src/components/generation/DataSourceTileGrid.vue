<template>
  <div class="tiles-grid">
    <data-source-tile
      v-for="source in sources"
      :key="source.sourceKey"
      :source="source"
      :cohort-id="cohortId"
      @tile-click="handleTileClick"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWebAPIStore } from '@/stores/webapi'
import DataSourceTile from './DataSourceTile.vue'
import type { CDMSource } from '@/models/webapi.types'

interface Props {
  cohortId: number | null
  sources?: CDMSource[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'tile-click': [sourceKey: string]
}>()

const webapiStore = useWebAPIStore()

const sources = computed(() => {
  return props.sources || webapiStore.sourcesList
})

// Forward tile click event to parent
function handleTileClick(sourceKey: string) {
  emit('tile-click', sourceKey)
}
</script>

<style scoped>
.tiles-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr; /* Mobile-first: 1 column */
}

@media (min-width: 1280px) {
  .tiles-grid {
    grid-template-columns: repeat(2, 1fr); /* 2 columns on large screens */
  }
}
</style>
