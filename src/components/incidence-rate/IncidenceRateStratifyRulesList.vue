<template>
  <div class="ir-strata-list">
    <div
      v-if="rules.length === 0"
      class="ir-strata-list__empty"
      data-testid="ir-strata-empty"
    >
      {{ t('incidenceRate.noStratifyRules', 'No stratify rules yet.').value }}
    </div>
    <div
      v-for="(rule, idx) in rules"
      :key="idx"
      class="ir-strata-row"
      data-testid="ir-strata-row"
    >
      <span class="ir-strata-row__num">{{ idx + 1 }}</span>
      <button
        class="ir-strata-row__name"
        :data-testid="`ir-strata-edit-${idx}`"
        :disabled="readonly"
        @click="$emit('edit', idx)"
      >
        {{ rule.name || t('incidenceRate.untitled', 'Untitled rule').value }}
      </button>
      <AtlasIconButton
        icon="mdi-arrow-up"
        size="sm"
        variant="text"
        density="compact"
        v-bind="{ ariaLabel: 'Move up' }"
        :disabled="readonly || idx === 0"
        :data-testid="`ir-strata-up-${idx}`"
        @click="$emit('move', idx, idx - 1)"
      />
      <AtlasIconButton
        icon="mdi-arrow-down"
        size="sm"
        variant="text"
        density="compact"
        v-bind="{ ariaLabel: 'Move down' }"
        :disabled="readonly || idx === rules.length - 1"
        :data-testid="`ir-strata-down-${idx}`"
        @click="$emit('move', idx, idx + 1)"
      />
      <AtlasIconButton
        icon="mdi-delete"
        size="sm"
        variant="text"
        density="compact"
        tone="danger"
        v-bind="{ ariaLabel: 'Remove rule' }"
        :disabled="readonly"
        :data-testid="`ir-strata-remove-${idx}`"
        @click="$emit('remove', idx)"
      />
    </div>
    <AtlasButton
      variant="ghost"
      size="sm"
      icon="mdi-plus"
      :disabled="readonly"
      data-testid="ir-strata-add"
      @click="$emit('add')"
    >
      {{ t('common.add', 'Add').value }}
    </AtlasButton>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasIconButton } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { StratifyRule } from '@/models/incidence-rate.types'

defineProps<{ rules: StratifyRule[]; readonly: boolean }>()
defineEmits<{
  add: []
  edit: [index: number]
  remove: [index: number]
  move: [from: number, to: number]
}>()
const { t } = useI18n()
</script>

<style scoped>
.ir-strata-list { display: flex; flex-direction: column; gap: 4px; }
.ir-strata-list__empty {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  padding: 6px 0;
}
.ir-strata-row {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 6px;
  border-radius: 4px;
}
.ir-strata-row:hover { background: rgba(var(--v-theme-on-surface), 0.04); }
.ir-strata-row__num {
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  width: 14px; flex-shrink: 0;
}
.ir-strata-row__name {
  flex: 1;
  text-align: left;
  background: transparent;
  border: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 12px;
  border-radius: 3px;
}
.ir-strata-row__name:hover { color: rgb(var(--v-theme-primary)); }
.ir-strata-row__name:disabled { cursor: default; }
</style>
