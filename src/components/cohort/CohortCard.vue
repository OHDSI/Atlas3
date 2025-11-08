<template>
  <v-card
    class="cohort-card"
    :elevation="hover ? 4 : 1"
    @click="handleCardClick"
    @mouseenter="hover = true"
    @mouseleave="hover = false"
  >
    <v-card-title class="cohort-card__title">
      {{ cohort.name }}
    </v-card-title>

  <v-card-subtitle class="cohort-card__subtitle">
    <div class="cohort-card__type">
      <v-icon size="16" color="#1f425a">mdi-web</v-icon>
      <span class="cohort-card__type-text">Atlas Cohort Definition</span>
    </div>
  </v-card-subtitle>    <v-card-text class="cohort-card__content">
      <div class="cohort-card__meta">
        <div class="cohort-card__meta-item">
          <span class="cohort-card__meta-label">ID:</span>
          <span class="cohort-card__meta-value">{{ cohort.id }}</span>
        </div>

        <div class="cohort-card__meta-item">
          <span class="cohort-card__meta-label">By:</span>
          <span class="cohort-card__meta-value">{{ formatUser(cohort.createdBy) }}</span>
        </div>

        <div class="cohort-card__meta-item">
          <span class="cohort-card__meta-label">Updated On:</span>
          <span class="cohort-card__meta-value">{{ formatDate(cohort.modifiedDate) }}</span>
        </div>
      </div>
    </v-card-text>

    <v-card-actions class="cohort-card__actions">
      <v-spacer />
      
      <v-tooltip text="Materialize Cohort" location="top">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="tooltipProps"
            icon
            size="small"
            variant="text"
            aria-label="Materialize cohort"
            class="cohort-card__action-btn"
            @click.stop="$emit('materialize', cohort)"
          >
            <v-icon color="#1f425a" size="22">mdi-account-multiple</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="Delete Cohort" location="top">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="tooltipProps"
            icon
            size="small"
            variant="text"
            aria-label="Delete cohort"
            class="cohort-card__action-btn"
            @click.stop="$emit('delete', cohort)"
          >
            <v-icon color="#1f425a" size="22">mdi-delete-outline</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

interface Props {
  cohort: CohortDefinitionSummary
}

interface Emits {
  (e: 'materialize', cohort: CohortDefinitionSummary): void
  (e: 'delete', cohort: CohortDefinitionSummary): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()
const hover = ref(false)

/**
 * Format user object or string to display name
 */
function formatUser(userValue: unknown): string {
  if (!userValue) return 'Unknown'
  if (typeof userValue === 'string') return userValue
  if (typeof userValue === 'object' && userValue !== null) {
    const user = userValue as Record<string, unknown>
    return (user.name || user.login || user.id || 'Unknown') as string
  }
  return 'Unknown'
}

/**
 * Format ISO 8601 date or timestamp to user-friendly format
 */
function formatDate(dateValue: string | number | null | undefined): string {
  if (!dateValue) return 'N/A'
  const date = new Date(dateValue)
  if (isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Navigate to cohort edit page
 */
function handleCardClick() {
  router.push(`/cohorts/${props.cohort.id}`)
}
</script>

<style scoped>
.cohort-card {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  border-radius: 4px;
}

.cohort-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.18);
  border-color: #d0d0d0;
}

.cohort-card__title {
  font-size: 0.9375rem;
  font-weight: 400;
  color: rgb(var(--v-theme-orange));
  word-break: break-word;
  padding: 16px 16px 8px;
  line-height: 1.3;
}

.cohort-card__subtitle {
  padding: 4px 16px 12px;
}

.cohort-card__type {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cohort-card__type-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #1f425a;
}

.cohort-card__content {
  flex: 1;
  padding: 0 16px 12px;
}

.cohort-card__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cohort-card__meta-item {
  display: flex;
  gap: 8px;
  font-size: 0.8125rem;
  line-height: 1.7;
}

.cohort-card__meta-label {
  font-weight: 700;
  color: #333;
  min-width: 85px;
}

.cohort-card__meta-value {
  color: #666;
  font-weight: 400;
}

.cohort-card__actions {
  padding: 8px 10px;
  background-color: transparent;
  border-top: none;
  min-height: 42px;
  display: flex;
  align-items: center;
}

.cohort-card__action-btn {
  opacity: 0.8;
  transition: opacity 0.2s;
}

.cohort-card__action-btn:hover {
  opacity: 1;
}
</style>
