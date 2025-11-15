<template>
  <v-card
    class="cohort-card"
    :elevation="hover ? 4 : 1"
    @click="handleCardClick"
    @mouseenter="hover = true"
    @mouseleave="hover = false"
  >
    <v-tooltip
      :text="cohort.name"
      location="top"
    >
      <template #activator="{ props: tooltipProps }">
        <v-card-title
          v-bind="tooltipProps"
          class="cohort-card__title"
        >
          <v-icon
            size="18"
            class="cohort-card__title-icon"
          >
            mdi-web
          </v-icon>
          <span class="cohort-card__title-text">{{ cohort.name }}</span>
        </v-card-title>
      </template>
    </v-tooltip>

    <!-- Description Preview -->
    <v-tooltip
      v-if="cohort.description"
      :text="cohort.description"
      location="bottom"
    >
      <template #activator="{ props: tooltipProps }">
        <v-card-text
          v-bind="tooltipProps"
          class="cohort-card__description"
        >
          {{ cohort.description }}
        </v-card-text>
      </template>
    </v-tooltip>

    <v-card-text class="cohort-card__content">
      <div class="cohort-card__meta">
        <div class="cohort-card__meta-row">
          <div class="cohort-card__meta-item">
            <span class="cohort-card__meta-label">{{ idLabel }}:</span>
            <span class="cohort-card__meta-value">{{ cohort.id }}</span>
          </div>

          <div class="cohort-card__meta-item">
            <span class="cohort-card__meta-label">{{ byLabel }}:</span>
            <span class="cohort-card__meta-value">{{ formatUser(cohort.createdBy) }}</span>
          </div>
        </div>

        <div class="cohort-card__meta-row">
          <div class="cohort-card__meta-item">
            <span class="cohort-card__meta-label">{{ createdLabel }}:</span>
            <span class="cohort-card__meta-value">{{ formatDate(cohort.createdDate) }}</span>
          </div>

          <div class="cohort-card__meta-item">
            <span class="cohort-card__meta-label">{{ updatedOnLabel }}:</span>
            <span class="cohort-card__meta-value">{{ formatDate(cohort.modifiedDate) }}</span>
          </div>
        </div>
      </div>
    </v-card-text>

    <v-card-actions class="cohort-card__actions">
      <!-- Tags -->
      <div
        v-if="cohort.tags && cohort.tags.length > 0"
        class="cohort-card__tags"
      >
        <v-chip
          v-for="tag in cohort.tags"
          :key="tag.id || tag.name"
          :color="tag.color || '#1f425a'"
          size="x-small"
          :variant="selectedTags.includes(tag.name) ? 'elevated' : 'flat'"
          :class="['cohort-card__tag', { 'cohort-card__tag--selected': selectedTags.includes(tag.name) }]"
          @click.stop="$emit('tag-click', tag.name)"
        >
          {{ tag.name }}
        </v-chip>
      </div>

      <v-spacer />
      
      <v-tooltip
        :text="materializeTooltip"
        location="top"
      >
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="tooltipProps"
            icon
            size="small"
            variant="text"
            aria-label="Generate cohort"
            class="cohort-card__action-btn"
            @click.stop="handleGenerate"
          >
            <v-icon
              color="#1f425a"
              size="22"
            >
              mdi-account-multiple
            </v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip
        :text="deleteTooltip"
        location="top"
      >
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
            <v-icon
              color="#1f425a"
              size="22"
            >
              mdi-delete-outline
            </v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

interface Props {
  cohort: CohortDefinitionSummary
  selectedTags?: string[]
}

interface Emits {
  (e: 'generate', cohort: CohortDefinitionSummary): void
  (e: 'delete', cohort: CohortDefinitionSummary): void
  (e: 'tag-click', tagName: string): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedTags: () => [],
})
const emit = defineEmits<Emits>()
const router = useRouter()
const hover = ref(false)
const { t, locale } = useI18n()

const idLabel = t('columns.id', 'ID')
const byLabel = t('columns.author', 'Author')
const createdLabel = t('columns.created', 'Created')
const updatedOnLabel = t('columns.modified', 'Modified')
const materializeTooltip = t('components.analysisExecution.buttons.generate', 'Generate')
const deleteTooltip = t('common.delete', 'Delete')
const unknownLabel = t('common.anonymous', 'Unknown')
const naLabel = t('common.noData', 'N/A')

/**
 * Format user object or string to display name
 */
function formatUser(userValue: unknown): string {
  if (!userValue) return unknownLabel.value
  if (typeof userValue === 'string') return userValue
  if (typeof userValue === 'object' && userValue !== null) {
    const user = userValue as Record<string, unknown>
    return (user.name || user.login || user.id || unknownLabel.value) as string
  }
  return unknownLabel.value
}

/**
 * Format ISO 8601 date or timestamp to user-friendly format
 */
function formatDate(dateValue: string | number | null | undefined): string {
  if (!dateValue) return naLabel.value
  const date = new Date(dateValue)
  if (isNaN(date.getTime())) return naLabel.value
  return date.toLocaleDateString(locale.value, {
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

/**
 * Emit generate event to open generation panel
 */
function handleGenerate() {
  emit('generate', props.cohort)
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
  padding: 16px 16px 12px;
  line-height: 1.3;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: help;
}

.cohort-card__title-icon {
  flex-shrink: 0;
  color: rgb(var(--v-theme-orange));
}

.cohort-card__title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.cohort-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.cohort-card__tag {
  font-size: 0.625rem;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.cohort-card__tag:hover {
  transform: scale(1.05);
  opacity: 0.9;
}

.cohort-card__tag--selected {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 8px rgba(0, 0, 0, 0.3);
  font-weight: 600;
}

.cohort-card__description {
  padding: 0 16px 12px;
  font-size: 0.8125rem;
  color: #666;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: help;
}

.cohort-card__content {
  flex: 1;
  padding: 0 16px 12px;
}

.cohort-card__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cohort-card__meta-row {
  display: flex;
  gap: 12px;
}

.cohort-card__meta-item {
  display: flex;
  gap: 6px;
  font-size: 0.8125rem;
  line-height: 1.7;
  flex: 1;
  min-width: 0;
}

.cohort-card__meta-label {
  font-weight: 700;
  color: #333;
  white-space: nowrap;
  flex-shrink: 0;
}

.cohort-card__meta-value {
  color: #666;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
