<template>
  <div
    class="nested-criteria-renderer"
    :style="{ marginLeft: `${depth * 24}px` }"
  >
    <!-- Depth Warning -->
    <AtlasAlert
      v-if="depth > 10"
      severity="warning"
      class="mb-2"
    >
      <AtlasIcon>mdi-alert</AtlasIcon>
      {{ t('components.nestedCriteriaRenderer.deepNesting', 'Deep nesting detected ({depth} levels). Consider simplifying your criteria structure.', { depth }).value }}
    </AtlasAlert>

    <!-- Logic Type Display -->
    <div class="logic-header">
      <AtlasChip
        size="sm"
        :tone="getLogicTone(nested.logicType)"
      >
        {{ formatLogicType(nested.logicType, nested.count) }}
      </AtlasChip>
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
          {{ event.conceptSet?.name || t('components.nestedCriteriaRenderer.noConceptSet', 'No concept set').value }}
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
import { AtlasAlert, AtlasChip, AtlasIcon, AtlasList, AtlasListItem } from '@/components/ui'
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

const { t, tv } = useI18n()
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

function getLogicTone(logicType: string): 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger' {
  const tones: Record<string, 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger'> = {
    ALL: 'primary',
    ANY: 'info',
    AT_LEAST: 'success',
    AT_MOST: 'warning',
  }
  return tones[logicType] || 'neutral'
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
