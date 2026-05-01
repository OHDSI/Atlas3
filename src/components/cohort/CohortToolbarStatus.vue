<template>
  <div class="cohort-toolbar-status">
    <!-- Description editing moved to the inline-edit subtitle in
         the page-shell hero header. This component now only hosts
         the icon-and-count chips for concept sets / validation /
         versions / tags. -->

    <!-- Concept Sets Icon -->
    <v-tooltip
      v-if="conceptSetCount > 0"
      :text="t('cohortDefinitions.cohortDefinitionManager.tabs.conceptSets', 'Concept Sets').value"
      location="bottom"
    >
      <template #activator="{ props: tooltipProps }">
        <v-badge
          v-bind="tooltipProps"
          :content="conceptSetCount"
          color="primary"
          class="cohort-toolbar-status__badge"
        >
          <v-icon
            color="primary"
            icon="mdi-shape"
            size="small"
            data-testid="concept-sets-icon"
            style="cursor: pointer"
            @click="$emit('show-concept-sets')"
          />
        </v-badge>
      </template>
    </v-tooltip>

    <!-- Versions Icon -->
    <v-tooltip
      v-if="cohortId && !isPreviewingVersion"
      :text="t('cohortDefinitions.cohortDefinitionManager.tabs.versions', 'Versions').value"
      location="bottom"
    >
      <template #activator="{ props: tooltipProps }">
        <v-badge
          v-bind="tooltipProps"
          :content="versionCount"
          color="primary"
          class="cohort-toolbar-status__badge"
        >
          <v-icon
            color="primary"
            icon="mdi-history"
            size="small"
            data-testid="versions-icon"
            style="cursor: pointer"
            @click="$emit('show-versions')"
          />
        </v-badge>
      </template>
    </v-tooltip>

    <!-- Tags Icon -->
    <v-tooltip
      v-if="!isPreviewingVersion"
      :text="t('configuration.buttons.tagManagement', 'Manage Tags').value"
      location="bottom"
    >
      <template #activator="{ props: tooltipProps }">
        <v-badge
          v-bind="tooltipProps"
          :content="tagCount || 0"
          :color="tagCount && tagCount > 0 ? 'primary' : 'grey'"
          class="cohort-toolbar-status__badge"
        >
          <v-icon
            color="primary"
            icon="mdi-tag-multiple"
            size="small"
            data-testid="tags-icon"
            style="cursor: pointer"
            @click="$emit('show-tags')"
          />
        </v-badge>
      </template>
    </v-tooltip>

    <!-- Validation Notification Icon -->
    <v-tooltip
      :text="isValidating ? t('common.loadingWithDots', 'Loading...').value : t('cc.viewEdit.tabs.messages', 'View validation messages').value"
      location="bottom"
    >
      <template #activator="{ props: tooltipProps }">
        <v-badge
          v-bind="tooltipProps"
          :content="validationCount"
          :color="validationCount > 0 ? validationColor : 'success'"
          class="cohort-toolbar-status__badge"
        >
          <v-icon
            v-if="isValidating"
            color="primary"
            icon="mdi-loading mdi-spin"
            size="small"
            data-testid="validation-icon-loading"
          />
          <v-icon
            v-else
            color="primary"
            icon="mdi-message-text"
            size="small"
            data-testid="validation-icon"
            style="cursor: pointer"
            @click="$emit('show-validation')"
          />
        </v-badge>
      </template>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

interface Props {
  conceptSetCount: number
  validationCount: number
  validationColor: string
  isValidating: boolean
  versionCount?: number
  tagCount?: number
  cohortId?: string | number | null
  isPreviewingVersion?: boolean
}

defineProps<Props>()

defineEmits<{
  (e: 'show-concept-sets'): void
  (e: 'show-validation'): void
  (e: 'show-versions'): void
  (e: 'show-tags'): void
}>()

const { t } = useI18n()
</script>

<style scoped lang="scss">
.cohort-toolbar-status {
  display: flex;
  align-items: center;
  gap: 12px;

  &__description {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__label {
    font-size: 12px;
    font-weight: 500;
    color: rgba(var(--v-theme-on-surface), 0.7);
  }

  &__description-input {
    border: none;
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    background: transparent;
    padding: 4px 8px;
    font-size: 14px;
    min-width: 200px;
    outline: none;

    &:focus {
      border-bottom-color: rgb(var(--v-theme-primary));
    }
  }

  &__badge {
    margin-left: 8px;
  }
}
</style>
