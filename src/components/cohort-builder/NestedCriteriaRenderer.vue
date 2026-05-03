<template>
  <div
    class="nested-criteria-renderer"
    :style="{ marginLeft: `${depth * 24}px` }"
  >
    <!-- Depth Warning -->
    <v-alert
      v-if="depth > 10"
      type="warning"
      variant="tonal"
      class="mb-2"
    >
      <AtlasIcon>mdi-alert</AtlasIcon>
      Deep nesting detected ({{ depth }} levels). Consider simplifying your criteria structure.
    </v-alert>

    <!-- Logic Type Display -->
    <div class="logic-header">
      <v-chip
        size="small"
        :color="getLogicColor(nested.logicType)"
      >
        {{ formatLogicType(nested.logicType, nested.count) }}
      </v-chip>
    </div>

    <!-- Events List -->
    <AtlasList
      v-if="nested.events.length > 0"
      density="compact"
      class="mt-2"
    >
      <AtlasListItem
        v-for="event in nested.events"
        :key="event.id"
      >
        <template #prepend>
          <AtlasIcon size="small">
            mdi-chevron-right
          </AtlasIcon>
        </template>

        <v-list-item-title class="text-caption">
          {{ formatEventType(event.criteriaType) }}:
          {{ event.conceptSet?.name || 'No concept set' }}
        </v-list-item-title>
      </AtlasListItem>
    </AtlasList>

    <!-- Recursive Nested Criteria -->
    <div
      v-if="nested.events.length > 0"
      class="nested-children"
    >
      <template
        v-for="event in nested.events"
        :key="`nested-${event.id}`"
      >
        <NestedCriteriaRenderer
          v-if="event.nestedCriteria"
          :nested="event.nestedCriteria"
          :depth="depth + 1"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasIcon, AtlasList, AtlasListItem } from '@/components/ui'
import { ref } from 'vue'
import type { NestedCriteria, CriteriaType } from '@/models/cohort.types'
import { useI18n } from '@/composables/useI18n'
import { useFilterConfig } from '@/composables/useFilterConfig'

interface Props {
  nested: NestedCriteria
  depth?: number
}

withDefaults(defineProps<Props>(), {
  depth: 0,
})

const { tv } = useI18n()
const { availableFilters } = useFilterConfig(ref('criteriaGroup'))

// Format logic type for display with i18n
function formatLogicType(logicType: string, count?: number): string {
  const labels: Record<string, string> = {
    ALL: tv('options.all', 'ALL of'),
    ANY: tv('options.any', 'ANY of'),
    AT_LEAST: `${tv('options.atLeast', 'At least')} ${count ?? 0} ${tv('options.of', 'of')}`,
    AT_MOST: `${tv('options.atMost', 'At most')} ${count ?? 0} ${tv('options.of', 'of')}`,
  }
  return labels[logicType] || logicType
}

// Get color for logic type
function getLogicColor(logicType: string): string {
  const colors: Record<string, string> = {
    ALL: 'primary',
    ANY: 'secondary',
    AT_LEAST: 'success',
    AT_MOST: 'warning',
  }
  return colors[logicType] || 'grey'
}

// Format event type using configuration-driven labels (supports all 16 filter types)
function formatEventType(type: CriteriaType): string {
  const filter = availableFilters.value.find(f => f.criteriaType === type)
  return filter?.name || type
}
</script>

<style scoped>
.nested-criteria-renderer {
  padding: 8px;
  border-left: 2px solid #e0e0e0;
  margin-top: 8px;
}

.logic-header {
  margin-bottom: 8px;
}

.nested-children {
  margin-top: 8px;
}
</style>
