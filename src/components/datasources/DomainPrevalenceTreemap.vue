<template>
  <div class="domain-prevalence-treemap">
    <div class="treemap-controls mb-4">
      <v-row align="center">
        <v-col
          cols="12"
          :md="hasHierarchy ? 8 : 12"
        >
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
              <div>
                <div>
                  <strong>Click</strong> on any area to view detailed analytics
                </div>
                <div
                  v-if="!hasHierarchy"
                  class="text-caption mt-1"
                >
                  Note: Hierarchical grouping not available for this data source
                </div>
              </div>
            </div>
          </v-alert>
        </v-col>
        <v-col
          v-if="hasHierarchy"
          cols="12"
          md="4"
          class="text-right"
        >
          <v-switch
            v-model="hierarchicalView"
            color="primary"
            density="compact"
            hide-details
            label="Group by hierarchy"
          />
        </v-col>
      </v-row>
    </div>

    <TreemapChart
      :data="treemapData"
      :height="500"
      :enable-zoom="false"
      @node-click="handleNodeClick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TreemapNode } from '@/models/datasource.types'
import TreemapChart from '@/components/reports/charts/TreemapChart.vue'
import { logger } from '@/utils/logger'

interface Props {
  data: TreemapNode[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'node-click': [conceptId: number, conceptName: string, conceptPath: string]
}>()

const hasHierarchy = computed(() => {
  const topLevelCategories = new Set<string>()
  let hasMultiLevelItems = false

  for (const item of props.data) {
    if (!item.conceptPath || !item.conceptPath.includes('||')) {
      continue
    }

    const levels = item.conceptPath
      .split('||')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0 && l !== 'NA' && l !== 'null' && l !== 'undefined')

    if (levels.length > 1) {
      hasMultiLevelItems = true
      topLevelCategories.add(levels[0]!)
    } else if (levels.length === 1) {
      topLevelCategories.add(levels[0]!)
    }
  }

  return hasMultiLevelItems && topLevelCategories.size >= 1
})

const hierarchicalView = ref(true)

function buildHierarchy(flatData: TreemapNode[]): TreemapNode[] {
  // Use Map during build, convert to arrays at end
  interface MapNode {
    name: string
    value: number
    children?: Map<string, MapNode>
    conceptId?: number
    conceptPath?: string
    itemStyle?: { color?: string }
  }

  const root: Map<string, MapNode> = new Map()

  flatData.forEach(item => {
    // Skip items with "NA" or invalid conceptPath
    if (!item.conceptPath || item.conceptPath === 'NA' || item.conceptPath === 'null' || item.conceptPath === 'undefined') {
      return
    }

    if (!item.conceptPath.includes('||')) {
      const nodeName = item.conceptPath
      if (!root.has(nodeName)) {
        root.set(nodeName, {
          name: item.name,
          value: item.value,
          conceptId: item.conceptId,
          conceptPath: item.conceptPath,
          itemStyle: item.itemStyle
        })
      } else {
        const existing = root.get(nodeName)
        if (existing) {
          existing.value += item.value
        }
      }
      return
    }

    const levels = item.conceptPath
      .split('||')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0 && l !== 'NA' && l !== 'null' && l !== 'undefined')

    if (levels.length === 0) {
      return
    }

    let currentLevel = root

    for (let i = 0; i < levels.length; i++) {
      const levelName = levels[i]!
      const isLeaf = i === levels.length - 1

      if (!currentLevel.has(levelName)) {
        const node: MapNode = {
          name: levelName,
          value: isLeaf ? item.value : 0,
          children: isLeaf ? undefined : new Map()
        }

        // Only add conceptId and conceptPath to leaf nodes
        if (isLeaf) {
          node.conceptId = item.conceptId
          node.conceptPath = item.conceptPath
          node.itemStyle = item.itemStyle
        }

        currentLevel.set(levelName, node)
      } else {
        const existing = currentLevel.get(levelName)
        if (existing && isLeaf) {
          existing.value += item.value
        } else if (!existing) {
          logger.warn('DomainPrevalenceTreemap', 'Existing node not found', { levelName, conceptPath: item.conceptPath })
        }
      }

      if (!isLeaf) {
        const currentNode = currentLevel.get(levelName)
        if (!currentNode) {
          logger.warn('DomainPrevalenceTreemap', 'Current node undefined', { levelName, conceptPath: item.conceptPath })
          return
        }

        if (!currentNode.children) {
          currentNode.children = new Map()
        }

        currentLevel = currentNode.children
      }
    }
  })

  function mapToArray(map: Map<string, MapNode>): TreemapNode[] {
    const result: TreemapNode[] = []
    map.forEach(node => {
      const treeNode: TreemapNode = {
        name: node.name,
        value: node.value
      }

      if (node.conceptId !== undefined) {
        treeNode.conceptId = node.conceptId
      }
      if (node.conceptPath !== undefined) {
        treeNode.conceptPath = node.conceptPath
      }
      if (node.itemStyle !== undefined) {
        treeNode.itemStyle = node.itemStyle
      }

      if (node.children && node.children.size > 0) {
        treeNode.children = mapToArray(node.children)
      }

      result.push(treeNode)
    })
    return result
  }

  const result = mapToArray(root)

  // Recursively calculate parent values from children
  function calculateParentValues(node: TreemapNode): number {
    if (!node.children || node.children.length === 0) {
      return node.value
    }

    const childrenTotal = node.children.reduce((sum, child) => {
      return sum + calculateParentValues(child)
    }, 0)

    node.value = childrenTotal
    return node.value
  }

  result.forEach(node => calculateParentValues(node))

  return result
}

const treemapData = computed(() => {
  if (hierarchicalView.value && hasHierarchy.value) {
    return buildHierarchy(props.data)
  }
  return props.data
})

function handleNodeClick(conceptId: number, conceptName: string, conceptPath: string) {
  emit('node-click', conceptId, conceptName, conceptPath)
}
</script>

<style scoped>
.domain-prevalence-treemap {
  width: 100%;
}

.treemap-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}
</style>
