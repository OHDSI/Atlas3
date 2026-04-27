<template>
  <div class="page-wrapper">
    <div class="page-card">
      <v-container
        fluid
        class="analysis-list"
      >
        <!-- Toolbar: actions left, view-mode toggle right -->
        <v-row align="center">
          <v-col cols="12">
            <div class="analysis-list__actions">
              <slot name="actions" />
              <v-spacer />
              <v-btn-toggle
                v-if="showViewToggle"
                :model-value="viewMode"
                mandatory
                density="compact"
                variant="outlined"
                divided
                class="analysis-list__view-toggle"
                :data-testid="testid ? `${testid}-view-toggle` : undefined"
                @update:model-value="onViewModeChange"
              >
                <v-btn
                  value="tile"
                  size="small"
                  :aria-label="t('common.tileView', 'Tile view').value"
                  :data-testid="testid ? `${testid}-view-toggle-tile` : undefined"
                >
                  <v-icon>mdi-view-grid</v-icon>
                </v-btn>
                <v-btn
                  value="table"
                  size="small"
                  :aria-label="t('common.tableView', 'Table view').value"
                  :data-testid="testid ? `${testid}-view-toggle-table` : undefined"
                >
                  <v-icon>mdi-view-list</v-icon>
                </v-btn>
              </v-btn-toggle>
            </div>
          </v-col>
        </v-row>

        <!-- Filters -->
        <v-row v-if="$slots.filters">
          <v-col cols="12">
            <slot name="filters" />
          </v-col>
        </v-row>

        <!-- Error banner -->
        <v-row v-if="error">
          <v-col cols="12">
            <v-alert
              type="error"
              variant="tonal"
              closable
              :data-testid="testid ? `${testid}-error` : undefined"
              @click:close="$emit('clear-error')"
            >
              {{ error }}
            </v-alert>
          </v-col>
        </v-row>

        <!-- Body (tile or table view) -->
        <v-row>
          <v-col cols="12">
            <slot />
          </v-col>
        </v-row>

        <!-- Pagination -->
        <v-row v-if="$slots.pagination">
          <v-col cols="12">
            <div class="analysis-list__pagination">
              <slot name="pagination" />
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

export type AnalysisViewMode = 'tile' | 'table'

interface Props {
  error?: string | null
  viewMode?: AnalysisViewMode
  showViewToggle?: boolean
  testid?: string
}

const props = withDefaults(defineProps<Props>(), {
  error: null,
  viewMode: 'tile',
  showViewToggle: false,
  testid: undefined,
})

const emit = defineEmits<{
  (e: 'clear-error'): void
  (e: 'update:viewMode', value: AnalysisViewMode): void
}>()

const { t } = useI18n()

function onViewModeChange(value: AnalysisViewMode | null) {
  if (value && value !== props.viewMode) {
    emit('update:viewMode', value)
  }
}
</script>

<style scoped>
.page-wrapper {
  min-height: 100%;
  background-color: rgb(var(--v-theme-background));
  display: flex;
  padding: 32px;
  box-sizing: border-box;
}

.page-card {
  border-radius: 18px;
  padding: 30px;
  background-color: white;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.analysis-list {
  padding: 0;
}

.analysis-list__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.analysis-list__view-toggle :deep(.v-btn) {
  border-color: rgba(0, 0, 0, 0.12);
}

.analysis-list__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
}
</style>
