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
          {{ item.invalidReason ? t('commonErrors.invalid', 'Invalid').value : t('commonErrors.valid', 'Valid').value }}
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
          <v-icon
            size="64"
            color="grey-lighten-1"
          >
            mdi-folder-open
          </v-icon>
          <p class="text-body-1 mt-4 text-grey">
            {{ t('cs.manager.noConcepts', 'No concepts selected').value }}
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
import { useI18n } from '@/composables/useI18n'
import type { ConceptSetItem } from '@/models/concept-set.types'

const { t } = useI18n()

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
  { title: t('columns.descendants', 'Descendants').value, key: 'includeDescendants', sortable: false, width: '100px' },
  { title: t('columns.mapped', 'Mapped').value, key: 'includeMapped', sortable: false, width: '80px' },
  { title: t('columns.exclude', 'Exclude').value, key: 'isExcluded', sortable: false, width: '80px' },
  { title: t('columns.conceptId', 'ID').value, key: 'conceptId', sortable: true, width: '100px' },
  { title: t('columns.conceptCode', 'Code').value, key: 'conceptCode', sortable: true, width: '120px' },
  { title: t('columns.conceptName', 'Name').value, key: 'conceptName', sortable: true },
  { title: t('columns.vocabulary', 'Vocabulary').value, key: 'vocabularyId', sortable: true, width: '120px' },
  { title: t('columns.type', 'Type').value, key: 'standardConcept', sortable: true, width: '140px' },
  { title: t('columns.domain', 'Domain').value, key: 'domainId', sortable: true, width: '120px' },
  { title: t('columns.class', 'Class').value, key: 'conceptClassId', sortable: true, width: '150px' },
  { title: t('columns.validEndDate', 'Validity').value, key: 'invalidReason', sortable: true, width: '100px' },
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
  if (concept.standardConcept === 'S') return t('search.standard', 'Standard').value
  if (concept.standardConcept === 'C') return t('search.classification', 'Classification').value
  return t('search.nonStandard', 'Non-Standard').value
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
