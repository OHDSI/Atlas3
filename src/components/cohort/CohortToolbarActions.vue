<template>
  <div class="cohort-toolbar-actions">
    <AtlasMenu>
      <template #activator="{ props: menuProps }">
        <AtlasIconButton
          v-bind="{ ...menuProps, ariaLabel: t('common.export').value }"
          icon="mdi-tools"
          variant="text"
          size="sm"
          data-testid="export-btn"
        />
      </template>
      <AtlasList
        density="compact"
        min-width="220"
      >
        <AtlasListItem
          data-testid="export-download-json"
          prepend-icon="mdi-download"
          :title="t('cohortDefinitions.cohortDefinitionManager.panels.json').value"
          :subtitle="t('common.downloadFile').value"
          @click="$emit('export-download')"
        />
        <AtlasListItem
          data-testid="export-copy-json"
          prepend-icon="mdi-clipboard-text-outline"
          :title="t('common.copyToClipboard').value"
          :subtitle="t('cohortDefinitions.cohortDefinitionManager.panels.json').value"
          @click="$emit('export-copy')"
        />
        <AtlasListItem
          data-testid="view-json"
          prepend-icon="mdi-code-json"
          :title="t('components.cohortBuilder.jsonViewEdit').value"
          :subtitle="t('components.cohortBuilder.jsonViewEditSubtitle').value"
          @click="$emit('view-json')"
        />
        <AtlasListItem
          data-testid="view-sql"
          prepend-icon="mdi-database-search"
          :title="t('components.cohortBuilder.sqlMenuTitle').value"
          :subtitle="t('components.cohortBuilder.sqlMenuSubtitle').value"
          @click="$emit('view-sql')"
        />
        <AtlasListItem
          data-testid="view-print-friendly"
          prepend-icon="mdi-file-document-outline"
          :title="t('components.cohortBuilder.printFriendlyMenuTitle').value"
          :subtitle="t('components.cohortBuilder.printFriendlyMenuSubtitle').value"
          @click="$emit('view-print-friendly')"
        />
      </AtlasList>
    </AtlasMenu>

    <span
      class="cohort-toolbar-actions__divider"
      data-testid="cohort-actions-divider"
    />

    <AtlasButton
      variant="ghost"
      data-testid="cohort-close-btn"
      @click="$emit('cancel')"
    >
      <AtlasIcon class="d-md-none">
        mdi-close
      </AtlasIcon>
      <span class="d-none d-md-inline">{{ isDirty ? t('common.cancel') : t('common.close') }}</span>
    </AtlasButton>

    <span class="cohort-toolbar-actions__save">
      <span
        v-if="isDirty && !isPreviewingVersion"
        class="cohort-toolbar-actions__dirty-dot"
        :title="t('common.unsavedChanges').value"
        data-testid="save-cohort-dirty-dot"
      />
      <DisabledReasonTooltip :reason="saveDisabledReason">
        <AtlasButton
          :disabled="!canSave || isPreviewingVersion"
          data-testid="save-cohort-btn"
          @click="$emit('save')"
        >
          {{ t('common.save') }}
        </AtlasButton>
      </DisabledReasonTooltip>
    </span>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasIcon, AtlasIconButton, AtlasList, AtlasListItem, AtlasMenu } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import DisabledReasonTooltip from '@/components/shared/DisabledReasonTooltip.vue'

interface Props {
  canSave: boolean
  isDirty?: boolean
  isPreviewingVersion?: boolean
  /**
   * Why Save is disabled, resolved by the builder. This component only sees a
   * single canSave boolean, which cannot say more than "you cannot save".
   */
  saveDisabledReason?: string
}

withDefaults(defineProps<Props>(), { saveDisabledReason: '' })

defineEmits<{
  (e: 'cancel'): void
  (e: 'save'): void
  (e: 'export-download'): void
  (e: 'export-copy'): void
  (e: 'view-sql'): void
  (e: 'view-json'): void
  (e: 'view-print-friendly'): void
}>()

const { t } = useI18n()
</script>

<style scoped lang="scss">
.cohort-toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.cohort-toolbar-actions__save {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.cohort-toolbar-actions__divider {
  display: inline-block;
  width: 1px;
  height: 22px;
  background: rgb(var(--v-theme-outline-variant, 224, 224, 224));
}

.cohort-toolbar-actions__dirty-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--atlas-color-surface) 90%, transparent);
  pointer-events: none;
}
</style>
