<template>
  <div class="sw-editor">
    <div
      v-if="!hasWindow"
      class="sw-empty"
    >
      <span class="sw-empty__hint">{{ t('incidenceRate.studyWindow.empty', 'No study window').value }}</span>
      <AtlasButton
        size="sm"
        variant="ghost"
        @click="enable"
      >
        {{ t('common.add', 'Add') }}
      </AtlasButton>
    </div>
    <template v-else>
      <div class="row">
        <AtlasTextField
          :model-value="store.currentIR?.expression.studyWindow?.startDate ?? ''"
          type="date"
          hide-details
          :label="t('incidenceRate.studyWindowStart', 'Start date').value"
          @update:model-value="(v: string | number) => update('startDate', String(v))"
        />
        <AtlasTextField
          :model-value="store.currentIR?.expression.studyWindow?.endDate ?? ''"
          type="date"
          hide-details
          :label="t('incidenceRate.studyWindowEnd', 'End date').value"
          @update:model-value="(v: string | number) => update('endDate', String(v))"
        />
      </div>
      <div class="sw-actions">
        <AtlasButton
          size="sm"
          variant="ghost"
          tone="danger"
          @click="store.clearStudyWindow"
        >
          {{ t('columns.remove', 'Remove') }}
        </AtlasButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasTextField } from '@/components/ui'
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'

const { t } = useI18n()
const store = useIncidenceRateStore()
const hasWindow = computed(() => !!store.currentIR?.expression.studyWindow)

function enable() {
  const today = new Date().toISOString().slice(0, 10)
  store.setStudyWindow({ startDate: '2020-01-01', endDate: today })
}

function update(field: 'startDate' | 'endDate', v: string) {
  const cur = store.currentIR?.expression.studyWindow
  if (!cur) return
  store.setStudyWindow({ ...cur, [field]: v })
}
</script>

<style scoped>
.sw-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sw-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.sw-empty__hint {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
.row {
  display: flex;
  gap: 8px;
}
.sw-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
