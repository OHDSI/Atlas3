<template>
  <div class="cohort-toolbar-status">
    <!-- Description Input -->
    <div class="cohort-toolbar-status__description">
      <label class="cohort-toolbar-status__label d-none d-md-inline">
        {{ t('columns.description', 'DESCRIPTION').value.toUpperCase() }}:
      </label>
      <!-- Inline input for larger screens -->
      <input
        :value="description"
        class="cohort-toolbar-status__description-input d-none d-md-inline-block"
        :placeholder="t('columns.description', 'Description').value"
        data-testid="cohort-description-input"
        @input="$emit('update:description', ($event.target as HTMLInputElement).value)"
      >
      <!-- Icon button for smaller screens -->
      <v-tooltip
        :text="t('columns.description', 'Description').value"
        location="bottom"
      >
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="tooltipProps"
            class="d-md-none"
            icon="mdi-text"
            variant="text"
            size="small"
            @click="showDescriptionDialog = true"
          />
        </template>
      </v-tooltip>
    </div>

    <!-- Description Dialog for smaller screens -->
    <v-dialog
      v-model="showDescriptionDialog"
      max-width="600"
    >
      <v-card>
        <v-card-title>{{ t('columns.description', 'Description').value }}</v-card-title>
        <v-card-text>
          <v-textarea
            :model-value="description"
            :placeholder="t('columns.description', 'Description').value"
            rows="3"
            variant="outlined"
            data-testid="cohort-description-dialog-input"
            @update:model-value="$emit('update:description', $event)"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDescriptionDialog = false">
            {{ t('common.close', 'Close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'

interface Props {
  description: string
  conceptSetCount: number
  validationCount: number
  validationColor: string
  isValidating: boolean
}

defineProps<Props>()

defineEmits<{
  (e: 'update:description', value: string): void
  (e: 'show-concept-sets'): void
  (e: 'show-validation'): void
}>()

const { t } = useI18n()

const showDescriptionDialog = ref(false)
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
