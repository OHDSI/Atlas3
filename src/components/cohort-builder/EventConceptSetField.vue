<template>
  <div
    class="event-concept-set-field"
    :class="{ 'event-concept-set-field--compact': compact }"
    data-testid="event-concept-set-field"
  >
    <div
      v-if="!compact"
      class="event-concept-set-field__title"
    >
      {{ label ?? t('common.conceptSet', 'Concept Set').value }}
    </div>
    <div class="event-concept-set-field__input">
      <AtlasButton
        v-if="!conceptSet || (conceptSet.id == null)"
        variant="secondary"
        size="sm"
        density="compact"
        :data-testid="pickerTestId"
        @click="emit('select')"
      >
        <AtlasIcon class="mr-2">
          mdi-plus
        </AtlasIcon>
        {{ selectLabel ?? t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value }}
      </AtlasButton>
      <AtlasChip
        v-else
        closable
        tone="primary"
        :data-testid="chipTestId"
        style="cursor: pointer"
        @click="emit('edit', conceptSet)"
        @close="emit('clear')"
      >
        {{ conceptSet.name }}
      </AtlasChip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasChip, AtlasIcon } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

withDefaults(
  defineProps<{
    conceptSet: { id: number | string; name: string } | undefined | null
    label?: string
    selectLabel?: string
    /** Compact, label-less, borderless variant for use inside a card header. */
    compact?: boolean
    /** Overridable so a card can host more than one instance (e.g. primary + source concept) with distinct test hooks. */
    pickerTestId?: string
    chipTestId?: string
  }>(),
  {
    conceptSet: undefined,
    label: undefined,
    selectLabel: undefined,
    compact: false,
    pickerTestId: 'concept-set-picker',
    chipTestId: 'selected-concept-set',
  }
)

const emit = defineEmits<{
  select: []
  clear: []
  edit: [conceptSet: { id: number | string; name: string }]
}>()
</script>

<style scoped>
.event-concept-set-field {
  display: flex;
  border-radius: 6px;
  border: 1px solid rgb(var(--v-theme-primary));
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.event-concept-set-field__title {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  flex: 0 0 auto;
  min-width: 140px;
  color: rgb(var(--v-theme-primary));
  background: #ebf2fa;
  font-size: 13px;
  font-weight: 500;
  border-right: 1px solid rgb(var(--v-theme-primary));
}

.event-concept-set-field__input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  flex: 1 1 auto;
  color: rgb(var(--v-theme-primary));
}

/* Compact variant: drop the box chrome so the picker sits inline in a card
   header (next to the event-type label). */
.event-concept-set-field--compact {
  border: none;
  background: transparent;
  border-radius: 0;
}
.event-concept-set-field--compact .event-concept-set-field__input {
  padding: 0;
}
</style>
