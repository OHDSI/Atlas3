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
      <v-icon>mdi-alert</v-icon>
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
    <v-list
      v-if="nested.events.length > 0"
      density="compact"
      class="mt-2"
    >
      <v-list-item
        v-for="event in nested.events"
        :key="event.id"
      >
        <template #prepend>
          <v-icon size="small">
            mdi-chevron-right
          </v-icon>
        </template>

        <v-list-item-title class="text-caption">
          {{ formatEventType(event.criteriaType) }}: {{ event.conceptSet?.name || 'No concept set' }}
        </v-list-item-title>
      </v-list-item>
    </v-list>

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

const { t } = useI18n()
const { availableFilters } = useFilterConfig(ref('criteriaGroup'))

// Format logic type for display with i18n
function formatLogicType(logicType: string, count?: number): string {
  const labels: Record<string, string> = {
    ALL: t('options.allOf', 'ALL of').value,
    ANY: t('options.anyOf', 'ANY of').value,
    AT_LEAST: `${t('options.atLeast', 'At least').value} ${count ?? 0} ${t('options.of', 'of').value}`,
    AT_MOST: `${t('options.atMost', 'At most').value} ${count ?? 0} ${t('options.of', 'of').value}`,
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
