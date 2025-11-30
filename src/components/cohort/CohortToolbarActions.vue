<template>
  <div class="cohort-toolbar-actions">
    <!-- Cancel Button -->
    <v-btn
      variant="outlined"
      @click="$emit('cancel')"
    >
      <v-icon class="d-md-none">
        mdi-close
      </v-icon>
      <span class="d-none d-md-inline">{{ t('common.cancel') }}</span>
    </v-btn>

    <!-- Save Button -->
    <v-btn
      color="primary"
      variant="flat"
      :disabled="!canSave"
      @click="$emit('save')"
    >
      <v-icon
        v-if="hasUnsavedChanges"
        start
        size="small"
        color="white"
        class="d-none d-md-inline"
      >
        mdi-circle
      </v-icon>
      <v-icon class="d-md-none">
        mdi-content-save
      </v-icon>
      <span class="d-none d-md-inline">{{ t('common.save') }}</span>
    </v-btn>

    <!-- Generate Button -->
    <v-btn
      v-if="showGenerate"
      color="orange"
      variant="outlined"
      :disabled="!canSave"
      data-testid="generate-btn"
      @click="$emit('generate')"
    >
      <v-icon
        class="d-none d-md-inline"
        start
      >
        mdi-database-cog
      </v-icon>
      <v-icon class="d-md-none">
        mdi-database-cog
      </v-icon>
      <span class="d-none d-md-inline">{{ t('components.analysisExecution.buttons.generate') }}</span>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

interface Props {
  canSave: boolean
  hasUnsavedChanges: boolean
  showGenerate: boolean
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
