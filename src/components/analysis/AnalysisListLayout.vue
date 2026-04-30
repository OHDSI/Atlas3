<template>
  <div class="analysis-list-layout">
    <header
      v-if="title || subtitle || $slots.title"
      class="analysis-list__header"
    >
      <div class="analysis-list__heading">
        <slot name="title">
          <h1
            v-if="title"
            class="analysis-list__title"
          >
            {{ title }}
          </h1>
        </slot>
        <p
          v-if="subtitle"
          class="analysis-list__subtitle"
        >
          {{ subtitle }}
        </p>
      </div>
    </header>

    <div class="analysis-list">
      <!-- Toolbar: actions left, view-mode toggle right -->
      <div class="analysis-list__toolbar">
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
              :aria-label="t('dataSources.table.tableTab', 'Table view').value"
              :data-testid="testid ? `${testid}-view-toggle-table` : undefined"
            >
              <v-icon>mdi-view-list</v-icon>
            </v-btn>
          </v-btn-toggle>
        </div>
      </div>

      <!-- Filters -->
      <div
        v-if="$slots.filters"
        class="analysis-list__filters"
      >
        <slot name="filters" />
      </div>

      <!-- Error banner -->
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        closable
        density="compact"
        class="analysis-list__error"
        :data-testid="testid ? `${testid}-error` : undefined"
        @click:close="$emit('clear-error')"
      >
        {{ error }}
      </v-alert>

      <!-- Body -->
      <div class="analysis-list__body">
        <slot />
      </div>

      <!-- Pagination -->
      <div
        v-if="$slots.pagination"
        class="analysis-list__pagination"
      >
        <slot name="pagination" />
      </div>
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
  title?: string
  subtitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  error: null,
  viewMode: 'tile',
  showViewToggle: false,
  testid: undefined,
  title: undefined,
  subtitle: undefined,
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
/* The outer card now comes from the parent page-shell (via
 * AnalysisHubView). This component just renders the section's
 * header + toolbar + body inside that card. */
.analysis-list-layout {
  display: flex;
  flex-direction: column;
}

.analysis-list__header {
  padding: 0 0 16px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.analysis-list__heading {
  min-width: 0;
}

.analysis-list__title {
  font-size: 1.5rem;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: rgba(var(--v-theme-on-surface), 0.92);
  margin: 0;
}

.analysis-list__subtitle {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.analysis-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.analysis-list__toolbar {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 4px 0;
  background: linear-gradient(
    to bottom,
    rgb(var(--v-theme-surface)) 75%,
    rgba(var(--v-theme-surface), 0)
  );
}

.analysis-list__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.analysis-list__filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.analysis-list__view-toggle :deep(.v-btn) {
  border-color: rgba(var(--v-theme-on-surface), 0.12);
}

.analysis-list__error {
  border-radius: 10px;
}

.analysis-list__body {
  /* The body sits inside the page-shell card already, so no extra
   * border or shadow is needed — the data table provides its own
   * row dividers. */
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.analysis-list__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 0 0;
}
</style>
