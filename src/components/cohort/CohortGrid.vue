<template>
  <div class="cohort-grid">
    <!-- Loading State - Skeleton Cards -->
    <div v-if="loading" class="cohort-grid__container">
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
          <v-icon start>mdi-refresh</v-icon>
          {{ t('common.refresh', 'Retry') }}
        </v-btn>
      </div>
    </v-alert>

    <!-- Empty State -->
    <div v-else-if="cohorts.length === 0" class="cohort-grid__empty">
      <v-icon size="80" color="grey-lighten-1">
        mdi-folder-open-outline
      </v-icon>
      <h2 class="cohort-grid__empty-title">{{ t('common.noData', 'No cohorts found').value }}</h2>
      <p class="cohort-grid__empty-subtitle">
        {{ emptyMessage }}
      </p>
      <v-btn
        color="primary"
        variant="elevated"
        size="large"
        class="mt-4"
        @click="$emit('create-cohort')"
      >
        <v-icon start>mdi-plus</v-icon>
        {{ t('common.createCohort', 'Create Cohort').value }}
      </v-btn>
    </div>

    <!-- Cohorts Grid -->
    <div v-else class="cohort-grid__container">
      <cohort-card
        v-for="cohort in cohorts"
        :key="cohort.id"
        :cohort="cohort"
        class="cohort-grid__card"
        @materialize="$emit('materialize', $event)"
        @delete="$emit('delete', $event)"
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
}

interface Emits {
  (e: 'retry'): void
  (e: 'create-cohort'): void
  (e: 'materialize', cohort: CohortDefinitionSummary): void
  (e: 'delete', cohort: CohortDefinitionSummary): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  searchQuery: '',
})

defineEmits<Emits>()

const skeletonCount = 12 // Show 12 skeleton loaders while loading

/**
 * Empty state message based on whether search is active
 */
const emptyMessage = computed(() => {
  if (props.searchQuery) {
    return `No cohorts found matching "${props.searchQuery}"`
  }
  return 'Get started by creating your first cohort definition'
})
</script>

<style scoped>
.cohort-grid {
  width: 100%;
  padding: 0 24px;
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
  padding: 64px 24px;
  text-align: center;
  min-height: 400px;
}

.cohort-grid__empty-title {
  font-size: 1.5rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
  margin-top: 16px;
  margin-bottom: 8px;
}

.cohort-grid__empty-subtitle {
  font-size: 1rem;
  color: rgba(0, 0, 0, 0.5);
  max-width: 500px;
}
</style>
