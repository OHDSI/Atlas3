<template>
  <div class="concept-set-table">
    <!-- Quick filter chips. Lets the user narrow a several-hundred-row
         set without typing — toggle a domain / vocabulary / standard
         flag and the table re-filters in place. -->
    <div
      v-if="items.length > 0"
      class="concept-set-table__filters"
    >
      <span class="concept-set-table__filters-label">{{ t('cs.manager.filters', 'Filter').value }}:</span>

      <v-chip
        v-for="domain in availableDomains"
        :key="`d-${domain}`"
        :color="getDomainColor(domain)"
        :variant="activeDomains.has(domain) ? 'flat' : 'tonal'"
        size="small"
        class="concept-set-table__filter-chip"
        @click="toggleDomainFilter(domain)"
      >
        {{ domain }}
        <span class="concept-set-table__filter-count">{{ domainCounts.get(domain) }}</span>
      </v-chip>

      <span
        v-if="availableVocabularies.length"
        class="concept-set-table__filters-divider"
      />

      <v-chip
        v-for="vocab in availableVocabularies"
        :key="`v-${vocab}`"
        :variant="activeVocabularies.has(vocab) ? 'flat' : 'tonal'"
        color="primary"
        size="small"
        class="concept-set-table__filter-chip"
        @click="toggleVocabFilter(vocab)"
      >
        {{ vocab }}
      </v-chip>

      <span class="concept-set-table__filters-divider" />

      <v-chip
        :variant="standardOnly ? 'flat' : 'tonal'"
        color="primary"
        size="small"
        class="concept-set-table__filter-chip"
        @click="standardOnly = !standardOnly"
      >
        {{ t('search.standard', 'Standard').value }}
      </v-chip>
      <v-chip
        :variant="excludedOnly ? 'flat' : 'tonal'"
        color="error"
        size="small"
        class="concept-set-table__filter-chip"
        @click="excludedOnly = !excludedOnly"
      >
        {{ t('columns.exclude', 'Excluded').value }}
      </v-chip>

      <AtlasSpacer />

      <AtlasButton
        v-if="hasActiveFilters"
        variant="ghost"
        size="sm"
        icon="mdi-close"
        @click="resetFilters"
      >
        {{ t('common.reset', 'Reset').value }}
      </AtlasButton>
    </div>

    <AtlasCard
      v-if="loading || filteredItems.length > 0"
      padding="none"
    >
      <v-data-table
        v-model:sort-by="sortBy"
        :headers="headers"
        :items="filteredItems"
        :loading="loading"
        :items-per-page="50"
        hover
        class="concept-set-table__table"
      >
        <!-- Descendants Toggle -->
        <template #item.includeDescendants="{ item }">
          <AtlasCheckbox
            :model-value="item.includeDescendants"
            hide-details
            @update:model-value="onToggleDescendants(item)"
          />
        </template>

        <!-- Mapped Toggle -->
        <template #item.includeMapped="{ item }">
          <AtlasCheckbox
            :model-value="item.includeMapped"
            hide-details
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

        <!-- Domain chip — coloured by domain so a 200-row set can be
             scanned at a glance. -->
        <template #item.domainId="{ item }">
          <v-chip
            v-if="item.domainId"
            :color="getDomainColor(item.domainId)"
            size="x-small"
            variant="tonal"
            class="concept-set-table__chip"
          >
            {{ item.domainId }}
          </v-chip>
        </template>

        <!-- Vocabulary chip — neutral tonal so it doesn't fight with
             the domain colour. -->
        <template #item.vocabularyId="{ item }">
          <v-chip
            v-if="item.vocabularyId"
            size="x-small"
            variant="outlined"
            class="concept-set-table__chip"
          >
            {{ item.vocabularyId }}
          </v-chip>
        </template>

        <!-- Standard concept badge -->
        <template #item.standardConcept="{ item }">
          <v-chip
            :color="getConceptTypeColor(item)"
            size="x-small"
            variant="tonal"
            class="concept-set-table__chip"
          >
            {{ getConceptTypeLabel(item) }}
          </v-chip>
        </template>

        <!-- Validity Badge -->
        <template #item.invalidReason="{ item }">
          <v-chip
            v-if="item.invalidReason"
            color="error"
            size="x-small"
            variant="tonal"
            class="concept-set-table__chip"
          >
            {{ t('commonErrors.invalid', 'Invalid').value }}
          </v-chip>
        </template>

        <!-- Actions Column — visible only on row hover, so a long
             list reads as data first. -->
        <template #item.actions="{ item }">
          <div class="concept-set-table__actions">
            <v-btn
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              color="error"
              @click="onRemove(item)"
            />
          </div>
        </template>

        <!-- Loading skeleton -->
        <template #loading>
          <AtlasSkeleton
            v-for="i in 5"
            :key="i"
            type="table-row"
            class="mx-2"
          />
        </template>
      </v-data-table>
    </AtlasCard>

    <!-- Empty / filtered-empty state -->
    <div
      v-else
      class="concept-set-table__empty"
    >
      <AtlasIcon
        :icon="hasActiveFilters ? 'mdi-filter-off-outline' : 'mdi-bookmark-outline'"
        size="36"
        class="concept-set-table__empty-icon"
      />
      <p class="concept-set-table__empty-text">
        {{
          hasActiveFilters
            ? t('cs.manager.emptyFilteredMessage', 'No concepts match the active filters.').value
            : t(
              'cs.manager.emptyConceptsMessage',
              'No concepts in this set yet — search for concepts or paste IDs to add them.'
            ).value
        }}
      </p>
      <v-btn
        v-if="hasActiveFilters"
        size="small"
        variant="tonal"
        prepend-icon="mdi-close"
        @click="resetFilters"
      >
        {{ t('common.reset', 'Reset').value }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { ConceptSetItem } from '@/models/concept-set.types'
import { AtlasButton, AtlasCard, AtlasCheckbox, AtlasIcon, AtlasSkeleton, AtlasSpacer } from '@/components/ui'
import { getDomainColor } from '@/utils/domain-colors'

const { t } = useI18n()

interface Props {
  items: ConceptSetItem[]
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'toggle:descendants': [conceptId: number]
  'toggle:mapped': [conceptId: number]
  'toggle:exclude': [conceptId: number]
  remove: [conceptId: number]
}>()

// ============================================================================
// Local state
// ============================================================================

const sortBy = ref([{ key: 'conceptId', order: 'asc' as const }])

// Quick-filter state. Domain and vocabulary are multi-select; the
// standard / excluded chips are single boolean toggles.
const activeDomains = ref(new Set<string>())
const activeVocabularies = ref(new Set<string>())
const standardOnly = ref(false)
const excludedOnly = ref(false)

// ============================================================================
// Available filter values + counts
// ============================================================================

const availableDomains = computed(() => {
  const set = new Set<string>()
  for (const i of props.items) if (i.domainId) set.add(i.domainId)
  return [...set].sort()
})

const availableVocabularies = computed(() => {
  const set = new Set<string>()
  for (const i of props.items) if (i.vocabularyId) set.add(i.vocabularyId)
  return [...set].sort()
})

const domainCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const i of props.items) {
    if (!i.domainId) continue
    counts.set(i.domainId, (counts.get(i.domainId) ?? 0) + 1)
  }
  return counts
})

const hasActiveFilters = computed(
  () =>
    activeDomains.value.size > 0 ||
    activeVocabularies.value.size > 0 ||
    standardOnly.value ||
    excludedOnly.value
)

const filteredItems = computed(() => {
  return props.items.filter(i => {
    if (activeDomains.value.size > 0 && (!i.domainId || !activeDomains.value.has(i.domainId))) {
      return false
    }
    if (
      activeVocabularies.value.size > 0 &&
      (!i.vocabularyId || !activeVocabularies.value.has(i.vocabularyId))
    ) {
      return false
    }
    if (standardOnly.value && i.standardConcept !== 'S') return false
    if (excludedOnly.value && !i.isExcluded) return false
    return true
  })
})

// ============================================================================
// Table headers — re-titled, denser. Vocabulary moved before Type.
// ============================================================================

const headers = [
  {
    title: t('columns.descendants', 'Desc.').value,
    key: 'includeDescendants',
    sortable: false,
    width: '76px',
  },
  {
    title: t('columns.mapped', 'Mapped').value,
    key: 'includeMapped',
    sortable: false,
    width: '72px',
  },
  { title: t('columns.exclude', 'Excl.').value, key: 'isExcluded', sortable: false, width: '64px' },
  { title: t('columns.conceptId', 'ID').value, key: 'conceptId', sortable: true, width: '90px' },
  {
    title: t('columns.conceptCode', 'Code').value,
    key: 'conceptCode',
    sortable: true,
    width: '110px',
  },
  { title: t('columns.conceptName', 'Name').value, key: 'conceptName', sortable: true },
  { title: t('columns.domain', 'Domain').value, key: 'domainId', sortable: true, width: '120px' },
  {
    title: t('columns.vocabulary', 'Vocabulary').value,
    key: 'vocabularyId',
    sortable: true,
    width: '120px',
  },
  {
    title: t('columns.type', 'Type').value,
    key: 'standardConcept',
    sortable: true,
    width: '120px',
  },
  {
    title: t('columns.validEndDate', 'Validity').value,
    key: 'invalidReason',
    sortable: true,
    width: '90px',
  },
  { title: '', key: 'actions', sortable: false, width: '56px' },
]

// ============================================================================
// Helpers
// ============================================================================

function getConceptTypeColor(concept: ConceptSetItem): string {
  if (concept.standardConcept === 'S') return 'primary'
  if (concept.standardConcept === 'C') return 'info'
  return 'default'
}

function getConceptTypeLabel(concept: ConceptSetItem): string {
  if (concept.standardConcept === 'S') return t('search.standard', 'Standard').value
  if (concept.standardConcept === 'C') return t('search.classification', 'Classification').value
  return t('search.nonStandard', 'Non-Std').value
}

function toggleDomainFilter(domain: string) {
  const next = new Set(activeDomains.value)
  if (next.has(domain)) next.delete(domain)
  else next.add(domain)
  activeDomains.value = next
}

function toggleVocabFilter(vocab: string) {
  const next = new Set(activeVocabularies.value)
  if (next.has(vocab)) next.delete(vocab)
  else next.add(vocab)
  activeVocabularies.value = next
}

function resetFilters() {
  activeDomains.value = new Set()
  activeVocabularies.value = new Set()
  standardOnly.value = false
  excludedOnly.value = false
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

.concept-set-table__filters {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.concept-set-table__filters-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-right: 4px;
}

.concept-set-table__filters-divider {
  display: inline-block;
  width: 1px;
  height: 18px;
  background: rgb(var(--v-theme-outline-variant, 224, 224, 224));
  margin: 0 6px;
}

.concept-set-table__filter-chip {
  cursor: pointer;
}

.concept-set-table__filter-count {
  margin-inline-start: 6px;
  font-size: 11px;
  opacity: 0.75;
}

.concept-set-table__chip {
  font-weight: 500;
}

/* Action column: only show on row hover so the long list reads as
 * data first. */
.concept-set-table__actions {
  opacity: 0;
  transition: opacity 120ms ease;
}
.concept-set-table__table :deep(tbody tr:hover) .concept-set-table__actions {
  opacity: 1;
}
.concept-set-table__table :deep(tbody tr:focus-within) .concept-set-table__actions {
  opacity: 1;
}

.concept-set-table__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 24px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface-variant));
}

.concept-set-table__empty-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
}

.concept-set-table__empty-text {
  margin: 0;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
  text-align: center;
  max-width: 480px;
}
</style>
