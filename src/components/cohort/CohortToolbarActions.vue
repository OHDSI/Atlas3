<template>
  <div class="cohort-toolbar-actions">
    <v-btn
      variant="text"
      @click="$emit('cancel')"
    >
      <v-icon class="d-md-none">
        mdi-close
      </v-icon>
      <span class="d-none d-md-inline">{{ t('common.cancel') }}</span>
    </v-btn>

    <v-menu>
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
      <v-list
        density="compact"
        min-width="220"
      >
        <v-list-item
          data-testid="export-download-json"
          prepend-icon="mdi-download"
          :title="t('cohortDefinitions.cohortDefinitionManager.panels.json', 'JSON').value"
          :subtitle="t('common.downloadFile', 'Download as file').value"
          @click="$emit('export-download')"
        />
        <v-list-item
          data-testid="export-copy-json"
          prepend-icon="mdi-clipboard-text-outline"
          :title="t('common.copyToClipboard', 'Copy To Clipboard').value"
          :subtitle="t('cohortDefinitions.cohortDefinitionManager.panels.json', 'JSON').value"
          @click="$emit('export-copy')"
        />
      </v-list>
    </v-menu>

    <v-btn
      v-if="showGenerate"
      variant="tonal"
      color="primary"
      :disabled="!canSave"
      data-testid="generate-btn"
      @click="$emit('generate')"
    >
      <v-icon
        class="d-none d-md-inline"
        start
      >
        mdi-database-cog-outline
      </v-icon>
      <v-icon class="d-md-none">
        mdi-database-cog-outline
      </v-icon>
      <span class="d-none d-md-inline">{{ t('components.analysisExecution.buttons.generate') }}</span>
    </v-btn>

    <v-btn
      color="primary"
      variant="flat"
      :disabled="!canSave || isPreviewingVersion"
      @click="$emit('save')"
    >
      <v-icon class="d-md-none">
        mdi-content-save-outline
      </v-icon>
      <span class="d-none d-md-inline">{{ t('common.save') }}</span>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
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
