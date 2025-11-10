<template>
  <div class="domain-prevalence-treemap">
    <div class="treemap-instructions mb-4">
      <v-alert
        type="info"
        variant="tonal"
        density="compact"
      >
        <div class="d-flex align-center">
          <v-icon
            icon="mdi-information-outline"
            class="mr-2"
          />
          <span>
            <strong>Ctrl+Click</strong> to zoom in, <strong>Alt+Click</strong> to reset zoom
          </span>
        </div>
      </v-alert>
    </div>
    
    <TreemapChart
      :data="data"
      :height="500"
      @node-click="handleNodeClick"
    />
  </div>
</template>

<script setup lang="ts">
import type { TreemapNode } from '@/models/datasource.types'
import TreemapChart from '@/components/reports/charts/TreemapChart.vue'

interface Props {
  data: TreemapNode[]
}

defineProps<Props>()

function handleNodeClick(_event: MouseEvent, node: TreemapNode) {
  // Zoom handled by TreemapChart component
  console.log('[TreemapChart] Node clicked:', node.name)
}
</script>

<style scoped>
.domain-prevalence-treemap {
  width: 100%;
}

.treemap-instructions {
  max-width: 600px;
}
</style>
