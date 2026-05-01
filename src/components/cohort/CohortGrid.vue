<template>
  <div class="cohort-grid">
    <!-- Loading State - Skeleton Cards -->
    <div
      v-if="loading"
      class="cohort-grid__container"
    >
      <v-skeleton-loader
        v-for="i in skeletonCount"
        :key="i"
        type="card"
        class="cohort-grid__skeleton"
      />
    </div>

    <!-- Error State -->
    <v-alert
      v-else-if="error"
      type="error"
      variant="tonal"
      class="cohort-grid__alert"
      closable
    >
      <div class="cohort-grid__error">
        <div class="cohort-grid__error-message">
          {{ error.message || t('common.errorLoadingCohorts', 'Failed to load cohorts').value }}
        </div>
        <v-btn
          color="error"
          variant="elevated"
          class="mt-4"
          @click="$emit('retry')"
        >
          <v-icon start>
            mdi-refresh
          </v-icon>
          {{ t('common.refresh', 'Retry') }}
        </v-btn>
      </div>
    </v-alert>

    <!-- Empty State: same MD3 filled container as concept-set list,
         with a context-aware CTA (clear filters vs. create new). -->
    <div
      v-else-if="cohorts.length === 0"
      class="cohort-grid__empty"
    >
      <v-icon
        :icon="isFiltered ? 'mdi-filter-off-outline' : 'mdi-bookmark-outline'"
        size="36"
        class="cohort-grid__empty-icon"
      />
      <p class="cohort-grid__empty-text">
        {{ emptyMessage }}
      </p>
      <v-btn
        v-if="isFiltered"
        size="small"
        variant="tonal"
        prepend-icon="mdi-close"
        @click="$emit('clear-filters')"
      >
        {{ t('search.clearAllSelections', 'Clear filters').value }}
      </v-btn>
      <v-btn
        v-else
        color="primary"
        variant="flat"
        prepend-icon="mdi-plus"
        @click="$emit('create-cohort')"
      >
        {{ t('cohortDefinitions.newDefinition', 'New cohort').value }}
      </v-btn>
    </div>

    <!-- Cohorts Grid -->
    <div
      v-else
      class="cohort-grid__container"
    >
      <cohort-card
        v-for="cohort in cohorts"
        :key="cohort.id"
        :cohort="cohort"
        :selected-tags="selectedTags"
        class="cohort-grid__card"
        @delete="$emit('delete', $event)"
        @tag-click="$emit('tag-click', $event)"
        @show-info="$emit('show-info', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import CohortCard from './CohortCard.vue'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

const { t } = useI18n()

interface Props {
  cohorts: CohortDefinitionSummary[]
  loading?: boolean
  error?: Error | null
  searchQuery?: string
  selectedTags?: string[]
}

interface Emits {
  (e: 'retry'): void
  (e: 'create-cohort'): void
  (e: 'clear-filters'): void
  (e: 'delete', cohort: CohortDefinitionSummary): void
  (e: 'tag-click', tagName: string): void
  (e: 'show-info', cohort: CohortDefinitionSummary): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  searchQuery: '',
  selectedTags: () => [],
})

defineEmits<Emits>()

const skeletonCount = 12 // Show 12 skeleton loaders while loading

const isFiltered = computed(() =>
  Boolean(props.searchQuery) || (props.selectedTags?.length ?? 0) > 0
)

/**
 * Empty state message: branches on whether the user is filtered or
 * on a truly-empty repository.
 */
const emptyMessage = computed(() => {
  if (props.searchQuery && (props.selectedTags?.length ?? 0) > 0) {
    return `No cohorts match "${props.searchQuery}" with the selected tags.`
  }
  if (props.searchQuery) return `No cohorts match "${props.searchQuery}".`
  if ((props.selectedTags?.length ?? 0) > 0) return 'No cohorts match the selected tags.'
  return 'No cohorts yet — create one to start defining a study population.'
})
</script>

<style scoped>
.cohort-grid {
  width: 100%;
}

.cohort-grid__container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  width: 100%;
}

/* Responsive breakpoints */
@media (max-width: 599px) {
  .cohort-grid__container {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 600px) and (max-width: 959px) {
  .cohort-grid__container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 960px) and (max-width: 1279px) {
  .cohort-grid__container {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .cohort-grid__container {
    grid-template-columns: repeat(4, 1fr);
  }
}

.cohort-grid__card,
.cohort-grid__skeleton {
  min-height: 200px;
}

.cohort-grid__alert {
  margin: 24px 0;
}

.cohort-grid__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.cohort-grid__error-message {
  font-size: 1rem;
  margin-bottom: 8px;
}

.cohort-grid__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 24px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface-variant));
}

.cohort-grid__empty-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
}

.cohort-grid__empty-text {
  margin: 0;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
  text-align: center;
  max-width: 480px;
}
</style>
