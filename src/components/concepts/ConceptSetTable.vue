<template>
  <div class="concept-set-table">
    <v-data-table
      :headers="headers"
      :items="items"
      :loading="loading"
      :items-per-page="50"
      class="elevation-1"
    >
      <!-- Descendants Toggle -->
      <template #item.includeDescendants="{ item }">
        <v-checkbox
          :model-value="item.includeDescendants"
          hide-details
          density="compact"
          @update:model-value="onToggleDescendants(item)"
        />
      </template>

      <!-- Mapped Toggle -->
      <template #item.includeMapped="{ item }">
        <v-checkbox
          :model-value="item.includeMapped"
          hide-details
          density="compact"
          @update:model-value="onToggleMapped(item)"
        />
      </template>

      <!-- Exclude Toggle -->
      <template #item.isExcluded="{ item }">
        <v-checkbox
          :model-value="item.isExcluded"
          hide-details
          density="compact"
          color="error"
          @update:model-value="onToggleExclude(item)"
        />
      </template>

      <!-- Concept Type Badge -->
      <template #item.standardConcept="{ item }">
        <v-chip
          :color="getConceptTypeColor(item)"
          size="small"
          label
        >
          {{ getConceptTypeLabel(item) }}
        </v-chip>
      </template>

      <!-- Validity Badge -->
      <template #item.invalidReason="{ item }">
        <v-chip
          :color="item.invalidReason ? 'error' : 'success'"
          size="small"
          label
        >
          {{ item.invalidReason ? 'Invalid' : 'Valid' }}
        </v-chip>
      </template>

      <!-- Actions Column -->
      <template #item.actions="{ item }">
        <v-btn
          icon="mdi-delete"
          size="small"
          variant="text"
          color="error"
          @click="onRemove(item)"
        />
      </template>

      <!-- No data message -->
      <template #no-data>
        <div class="text-center py-8">
          <v-icon size="64" color="grey-lighten-1">mdi-folder-open</v-icon>
          <p class="text-body-1 mt-4 text-grey">
            No concepts selected
          </p>
          <p class="text-caption text-grey">
            Search for concepts and add them to this concept set
          </p>
        </div>
      </template>

      <!-- Loading skeleton -->
      <template #loading>
        <v-skeleton-loader
          v-for="i in 5"
          :key="i"
          type="table-row"
          class="mx-2"
        />
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import type { ConceptSetItem } from '@/models/concept-set.types'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  items: ConceptSetItem[]
  loading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'toggle:descendants': [conceptId: number]
  'toggle:mapped': [conceptId: number]
  'toggle:exclude': [conceptId: number]
  'remove': [conceptId: number]
}>()

// ============================================================================
// Table Configuration
// ============================================================================

const headers = [
  { title: 'Descendants', key: 'includeDescendants', sortable: false, width: '100px' },
  { title: 'Mapped', key: 'includeMapped', sortable: false, width: '80px' },
  { title: 'Exclude', key: 'isExcluded', sortable: false, width: '80px' },
  { title: 'ID', key: 'conceptId', sortable: true, width: '100px' },
  { title: 'Code', key: 'conceptCode', sortable: true, width: '120px' },
  { title: 'Name', key: 'conceptName', sortable: true },
  { title: 'Vocabulary', key: 'vocabularyId', sortable: true, width: '120px' },
  { title: 'Type', key: 'standardConcept', sortable: true, width: '140px' },
  { title: 'Domain', key: 'domainId', sortable: true, width: '120px' },
  { title: 'Class', key: 'conceptClassId', sortable: true, width: '150px' },
  { title: 'Validity', key: 'invalidReason', sortable: true, width: '100px' },
  { title: '', key: 'actions', sortable: false, width: '60px' },
]

// ============================================================================
// Methods
// ============================================================================

function getConceptTypeColor(concept: ConceptSetItem): string {
  if (concept.standardConcept === 'S') return 'primary'
  if (concept.standardConcept === 'C') return 'info'
  return 'default'
}

function getConceptTypeLabel(concept: ConceptSetItem): string {
  if (concept.standardConcept === 'S') return 'Standard'
  if (concept.standardConcept === 'C') return 'Classification'
  return 'Non-Standard'
}

function onToggleDescendants(item: ConceptSetItem) {
  emit('toggle:descendants', item.conceptId)
}

function onToggleMapped(item: ConceptSetItem) {
  emit('toggle:mapped', item.conceptId)
}

function onToggleExclude(item: ConceptSetItem) {
  emit('toggle:exclude', item.conceptId)
}

function onRemove(item: ConceptSetItem) {
  emit('remove', item.conceptId)
}
</script>

<style scoped>
.concept-set-table {
  width: 100%;
}
</style>
