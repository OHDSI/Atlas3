<template>
  <div class="cohort-toolbar-status">
    <!-- Description editing moved to the inline-edit subtitle in
         the page-shell hero header. This component now only hosts
         the icon-and-count chips for concept sets / validation /
         versions / tags. -->

    <!-- Concept Sets Icon — always shown so the toolbar shape stays
         stable across builders. Disabled (dim, no click) when there
         are no concept sets to navigate to. -->
    <AtlasTooltip
      :text="t('cohortDefinitions.cohortDefinitionManager.tabs.conceptSets', 'Concept Sets').value"
      location="bottom"
    >
      <template #activator="{ props: tooltipProps }">
        <AtlasBadge
          v-bind="tooltipProps"
          :content="unusedConceptSetCount"
          :model-value="unusedConceptSetCount > 0"
          color="primary"
          class="cohort-toolbar-status__badge"
        >
          <AtlasIcon
            :color="totalConceptSets > 0 ? 'primary' : 'grey'"
            icon="mdi-shape"
            size="small"
            data-testid="concept-sets-icon"
            :style="totalConceptSets > 0 ? 'cursor: pointer' : 'cursor: default; opacity: 0.5'"
            @click="totalConceptSets > 0 && $emit('show-concept-sets')"
          />
        </AtlasBadge>
      </template>
    </AtlasTooltip>

    <!-- Versions Icon — always shown; disabled when entity isn't
         saved yet or the user is previewing a historical version. -->
    <AtlasTooltip
      :text="t('cohortDefinitions.cohortDefinitionManager.tabs.versions', 'Versions').value"
      location="bottom"
    >
      <template #activator="{ props: tooltipProps }">
        <AtlasBadge
          v-bind="tooltipProps"
          :content="versionCount"
          :model-value="!!cohortId && !isPreviewingVersion"
          color="primary"
          class="cohort-toolbar-status__badge"
        >
          <AtlasIcon
            :color="cohortId && !isPreviewingVersion ? 'primary' : 'grey'"
            icon="mdi-history"
            size="small"
            data-testid="versions-icon"
            :style="cohortId && !isPreviewingVersion ? 'cursor: pointer' : 'cursor: default; opacity: 0.5'"
            @click="cohortId && !isPreviewingVersion && $emit('show-versions')"
          />
        </AtlasBadge>
      </template>
    </AtlasTooltip>

    <!-- Tags Icon — always shown; disabled in version-preview mode. -->
    <AtlasTooltip
      :text="t('configuration.buttons.tagManagement', 'Manage Tags').value"
      location="bottom"
    >
      <template #activator="{ props: tooltipProps }">
        <AtlasBadge
          v-bind="tooltipProps"
          :content="tagCount || 0"
          :color="tagCount && tagCount > 0 ? 'primary' : 'grey'"
          class="cohort-toolbar-status__badge"
        >
          <AtlasIcon
            :color="!isPreviewingVersion ? 'primary' : 'grey'"
            icon="mdi-tag-multiple"
            size="small"
            data-testid="tags-icon"
            :style="!isPreviewingVersion ? 'cursor: pointer' : 'cursor: default; opacity: 0.5'"
            @click="!isPreviewingVersion && $emit('show-tags')"
          />
        </AtlasBadge>
      </template>
    </AtlasTooltip>

    <!-- Validation Notification Icon -->
    <AtlasTooltip
      :text="
        isValidating
          ? t('common.loadingWithDots', 'Loading...').value
          : t('cc.viewEdit.tabs.messages', 'View validation messages').value
      "
      location="bottom"
    >
      <template #activator="{ props: tooltipProps }">
        <AtlasBadge
          v-bind="tooltipProps"
          :content="validationCount"
          :color="validationCount > 0 ? validationColor : 'success'"
          class="cohort-toolbar-status__badge"
        >
          <AtlasIcon
            v-if="isValidating"
            color="primary"
            icon="mdi-loading mdi-spin"
            size="small"
            data-testid="validation-icon-loading"
          />
          <AtlasIcon
            v-else
            color="primary"
            icon="mdi-message-text"
            size="small"
            data-testid="validation-icon"
            style="cursor: pointer"
            @click="$emit('show-validation')"
          />
        </AtlasBadge>
      </template>
    </AtlasTooltip>
  </div>
</template>

<script setup lang="ts">
import { AtlasBadge, AtlasIcon, AtlasTooltip } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'

interface Props {
  totalConceptSets: number
  unusedConceptSetCount: number
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

    &:focus-visible {
      outline: 2px solid rgb(var(--v-theme-primary));
      outline-offset: 2px;
      border-bottom-color: rgb(var(--v-theme-primary));
    }
  }

  &__badge {
    margin-left: 8px;
  }
}

/* Vuetify's grey (#9e9e9e) with a white foreground is 2.68:1 — pre-existing
 * in both themes, but out of scope to fix in light. Dark-only override to
 * grey-darken-2 (#616161), which clears the 4.5:1 text floor at 6.19:1.
 * Scoped to this component's badges so the general bg-grey utility class is
 * unaffected elsewhere. */
.v-theme--dark .cohort-toolbar-status :deep(.v-badge__badge.bg-grey) {
  background-color: #616161 !important;
}
</style>
