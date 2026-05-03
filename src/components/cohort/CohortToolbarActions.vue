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
        <v-btn
          v-bind="menuProps"
          variant="text"
          icon="mdi-export-variant"
          size="small"
          :aria-label="t('common.export', 'Export').value"
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

    <v-btn
      v-if="showGenerate"
      variant="tonal"
      color="primary"
      :disabled="!canSave"
      data-testid="generate-btn"
      @click="$emit('generate')"
    >
      <AtlasIcon
        class="d-none d-md-inline"
        start
      >
        mdi-database-cog-outline
      </AtlasIcon>
      <AtlasIcon class="d-md-none">
        mdi-database-cog-outline
      </AtlasIcon>
      <span class="d-none d-md-inline">{{
        t('components.analysisExecution.buttons.generate')
      }}</span>
    </v-btn>

    <AtlasButton
      :disabled="!canSave || isPreviewingVersion"
      @click="$emit('save')"
    >
      <AtlasIcon class="d-md-none">
        mdi-content-save-outline
      </AtlasIcon>
      <span class="d-none d-md-inline">{{ t('common.save') }}</span>
    </AtlasButton>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasIcon, AtlasList, AtlasListItem, AtlasMenu } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'

interface Props {
  canSave: boolean
  showGenerate: boolean
  isPreviewingVersion?: boolean
}

defineProps<Props>()

defineEmits<{
  (e: 'cancel'): void
  (e: 'save'): void
  (e: 'generate'): void
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
</style>
