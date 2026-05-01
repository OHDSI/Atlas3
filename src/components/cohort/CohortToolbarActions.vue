<template>
  <div class="cohort-toolbar-actions">
    <!-- Cancel — quiet text variant since it's a secondary path. -->
    <v-btn
      variant="text"
      @click="$emit('cancel')"
    >
      <v-icon class="d-md-none">
        mdi-close
      </v-icon>
      <span class="d-none d-md-inline">{{ t('common.cancel') }}</span>
    </v-btn>

    <!-- Generate — secondary primary action, tonal so it doesn't
         compete with Save. Was orange-outlined which read as alarm. -->
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

    <!-- Save — the primary call to action. The disabled state
         already reflects "no changes / can't save", so the legacy
         mdi-circle "unsaved" dot was redundant. -->
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
