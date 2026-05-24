<template>
  <div class="cohort-toolbar-actions">
    <AtlasButton
      variant="ghost"
      @click="$emit('cancel')"
    >
      <AtlasIcon class="d-md-none">
        mdi-close
      </AtlasIcon>
      <span class="d-none d-md-inline">{{ t('common.cancel') }}</span>
    </AtlasButton>

    <AtlasMenu>
      <template #activator="{ props: menuProps }">
        <AtlasIconButton
          v-bind="{ ...menuProps, ariaLabel: t('common.export', 'Export').value }"
          icon="mdi-export-variant"
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
          :title="t('cohortDefinitions.cohortDefinitionManager.panels.json', 'JSON').value"
          :subtitle="t('common.downloadFile', 'Download as file').value"
          @click="$emit('export-download')"
        />
        <AtlasListItem
          data-testid="export-copy-json"
          prepend-icon="mdi-clipboard-text-outline"
          :title="t('common.copyToClipboard', 'Copy To Clipboard').value"
          :subtitle="t('cohortDefinitions.cohortDefinitionManager.panels.json', 'JSON').value"
          @click="$emit('export-copy')"
        />
      </AtlasList>
    </AtlasMenu>

    <span class="cohort-toolbar-actions__save">
      <span
        v-if="isDirty && !isPreviewingVersion"
        class="cohort-toolbar-actions__dirty-dot"
        :title="t('common.unsavedChanges', 'Unsaved changes').value"
        data-testid="save-cohort-dirty-dot"
      />
      <AtlasButton
        :disabled="!canSave || isPreviewingVersion"
        data-testid="save-cohort-btn"
        @click="$emit('save')"
      >
        <AtlasIcon class="d-md-none">
          mdi-content-save-outline
        </AtlasIcon>
        <span class="d-none d-md-inline">{{ t('common.save') }}</span>
      </AtlasButton>
    </span>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasIcon, AtlasIconButton, AtlasList, AtlasListItem, AtlasMenu } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'

interface Props {
  canSave: boolean
  isDirty?: boolean
  isPreviewingVersion?: boolean
}

defineProps<Props>()

defineEmits<{
  (e: 'cancel'): void
  (e: 'save'): void
  (e: 'export-download'): void
  (e: 'export-copy'): void
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

.cohort-toolbar-actions__dirty-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.9);
  pointer-events: none;
}
</style>
