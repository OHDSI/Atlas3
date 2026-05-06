<template>
  <AtlasCard
    interactive
    padding="none"
    class="cohort-card"
    @click="handleCardClick"
  >
    <div class="cohort-card__body">
      <AtlasTooltip
        :text="cohort.name"
        location="top"
      >
        <template #activator="{ props: tooltipProps }">
          <h3
            v-bind="tooltipProps"
            class="cohort-card__title"
          >
            {{ cohort.name }}
          </h3>
        </template>
      </AtlasTooltip>

      <AtlasTooltip
        v-if="cohort.description"
        :text="cohort.description"
        location="bottom"
      >
        <template #activator="{ props: tooltipProps }">
          <p
            v-bind="tooltipProps"
            class="cohort-card__description"
          >
            {{ cohort.description }}
          </p>
        </template>
      </AtlasTooltip>

      <dl class="cohort-card__meta">
        <div class="cohort-card__meta-row">
          <dt>{{ idLabel }}</dt>
          <dd>{{ cohort.id }}</dd>
          <dt>{{ byLabel }}</dt>
          <dd>{{ formatUser(cohort.createdBy) }}</dd>
        </div>
        <div class="cohort-card__meta-row">
          <dt>{{ createdLabel }}</dt>
          <dd>{{ formatDate(cohort.createdDate) }}</dd>
          <dt>{{ updatedOnLabel }}</dt>
          <dd>{{ formatDate(cohort.modifiedDate) }}</dd>
        </div>
      </dl>
    </div>

    <div class="cohort-card__footer">
      <div
        v-if="cohort.tags && cohort.tags.length > 0"
        class="cohort-card__tags"
      >
        <AtlasChip
          v-for="tag in cohort.tags"
          :key="tag.id || tag.name"
          size="sm"
          variant="flat"
          class="cohort-card__tag"
          :style="{
            backgroundColor: tagColor(tag.color),
            color: tagContrastColor(tag.color),
            boxShadow: selectedTags.includes(tag.name)
              ? `0 0 0 2px rgb(var(--v-theme-primary))`
              : undefined,
          }"
          @click.stop="$emit('tag-click', tag.name)"
        >
          {{ tag.name }}
        </AtlasChip>
      </div>

      <AtlasSpacer />

      <AtlasTooltip
        :text="infoTooltip"
        location="top"
      >
        <template #activator="{ props: tooltipProps }">
          <AtlasIconButton
            v-bind="{ ...tooltipProps, ariaLabel: infoTooltip }"
            icon="mdi-information-outline"
            variant="text"
            size="sm"
            class="cohort-card__action-btn"
            @click.stop="$emit('show-info', cohort)"
          />
        </template>
      </AtlasTooltip>

      <AtlasTooltip
        :text="generateTooltipText"
        location="top"
      >
        <template #activator="{ props: tooltipProps }">
          <AtlasIconButton
            v-bind="{ ...tooltipProps, ariaLabel: 'Generate cohort' }"
            icon="mdi-account-multiple"
            variant="text"
            size="sm"
            class="cohort-card__action-btn"
            :disabled="!canWrite"
            @click.stop="handleGenerate"
          />
        </template>
      </AtlasTooltip>

      <AtlasTooltip
        :text="deleteTooltipText"
        location="top"
      >
        <template #activator="{ props: tooltipProps }">
          <AtlasIconButton
            v-bind="{ ...tooltipProps, ariaLabel: deleteTooltip }"
            icon="mdi-delete-outline"
            variant="text"
            size="sm"
            class="cohort-card__action-btn"
            :disabled="!canDelete"
            @click.stop="$emit('delete', cohort)"
          />
        </template>
      </AtlasTooltip>
    </div>
  </AtlasCard>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useEntityAccess } from '@/composables/useEntityAccess'
import type { CohortDefinitionSummary } from '@/models/webapi.types'
import { AtlasCard, AtlasChip, AtlasIconButton, AtlasSpacer, AtlasTooltip } from '@/components/ui'
import { tagColor, tagContrastColor } from '@/utils/tag-color'

interface Props {
  cohort: CohortDefinitionSummary
  selectedTags?: string[]
}

interface Emits {
  (e: 'generate', cohort: CohortDefinitionSummary): void
  (e: 'delete', cohort: CohortDefinitionSummary): void
  (e: 'tag-click', tagName: string): void
  (e: 'show-info', cohort: CohortDefinitionSummary): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedTags: () => [],
})
const emit = defineEmits<Emits>()
const router = useRouter()
const { t, locale } = useI18n()

const idLabel = t('columns.id', 'ID')
const byLabel = t('columns.author', 'Author')
const createdLabel = t('columns.created', 'Created')
const updatedOnLabel = t('columns.modified', 'Modified')
const infoTooltip = t('common.cohortInformation', 'Cohort information')
const materializeTooltip = t('components.analysisExecution.buttons.generate', 'Generate')
const deleteTooltip = t('common.delete', 'Delete')
const noPermissionTooltip = t('common.noPermission', 'You do not have permission for this action')
const unknownLabel = t('common.anonymous', 'Unknown')
const naLabel = t('common.noData', 'N/A')

const cohortId = toRef(() => props.cohort.id)
const { canWrite, canDelete } = useEntityAccess('cohortDefinition', cohortId)
const generateTooltipText = computed(() =>
  canWrite.value ? materializeTooltip.value : noPermissionTooltip.value
)
const deleteTooltipText = computed(() =>
  canDelete.value ? deleteTooltip.value : noPermissionTooltip.value
)

function formatUser(userValue: unknown): string {
  if (!userValue) return unknownLabel.value
  if (typeof userValue === 'string') return userValue
  if (typeof userValue === 'object' && userValue !== null) {
    const user = userValue as Record<string, unknown>
    return (user.name || user.login || user.id || unknownLabel.value) as string
  }
  return unknownLabel.value
}

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

function handleCardClick() {
  router.push(`/cohorts/${props.cohort.id}`)
}

function handleGenerate() {
  emit('generate', props.cohort)
}
</script>

<style scoped>
/* SurfaceCard provides elevation, hover lift, and border-radius;
 * this component layers content + footer on top with consistent
 * padding. */
.cohort-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.cohort-card__body {
  padding: 16px 18px 12px;
  flex: 1;
}

.cohort-card__title {
  font-size: 15px;
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
  margin: 0 0 8px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.cohort-card__description {
  margin: 0 0 12px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.cohort-card__meta {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cohort-card__meta-row {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  gap: 4px 8px;
  font-size: 12px;
  align-items: baseline;
}

.cohort-card__meta-row dt {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface-variant));
}

.cohort-card__meta-row dd {
  margin: 0;
  color: rgba(0, 0, 0, 0.74);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.cohort-card__footer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-top: 1px solid rgb(var(--v-theme-outline-variant, 224, 224, 224));
}

.cohort-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.cohort-card__tag {
  cursor: pointer;
}

.cohort-card__action-btn {
  opacity: 0.7;
  transition: opacity 120ms ease;
}
.cohort-card:hover .cohort-card__action-btn,
.cohort-card:focus-within .cohort-card__action-btn {
  opacity: 1;
}
</style>
