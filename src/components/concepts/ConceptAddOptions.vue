<template>
  <div class="concept-add-options">
    <div class="concept-add-options__flags">
      <span class="concept-add-options__caption">{{ t('cs.conceptAddBox.addWith', 'Add with') }}</span>
      <v-checkbox-btn
        :model-value="modelValue.includeDescendants"
        :label="t('cs.conceptAddBox.descendants', 'Descendants').value"
        density="compact"
        hide-details
        data-testid="add-option-descendants"
        @update:model-value="(v: boolean | null) => onToggle('includeDescendants', v)"
      />
      <v-checkbox-btn
        :model-value="modelValue.includeMapped"
        :label="t('cs.conceptAddBox.mapped', 'Mapped').value"
        density="compact"
        hide-details
        data-testid="add-option-mapped"
        @update:model-value="(v: boolean | null) => onToggle('includeMapped', v)"
      />
      <v-checkbox-btn
        :model-value="modelValue.isExcluded"
        :label="t('cs.conceptAddBox.exclude', 'Exclude').value"
        density="compact"
        hide-details
        data-testid="add-option-exclude"
        @update:model-value="(v: boolean | null) => onToggle('isExcluded', v)"
      />
    </div>
    <AtlasButton
      size="sm"
      icon="mdi-plus"
      :disabled="selectedCount === 0 || disabled"
      data-testid="add-selected"
      @click="emit('add')"
    >
      {{ t('cs.conceptAddBox.addToConceptSet', 'Add To Concept Set') }}
      <span
        v-if="selectedCount > 0"
        class="ml-1"
      >({{ selectedCount }})</span>
    </AtlasButton>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { ConceptAddFlags } from '@/models/concept-set.types'

interface Props {
  modelValue: Required<ConceptAddFlags>
  selectedCount: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), { disabled: false })

const emit = defineEmits<{
  'update:modelValue': [flags: Required<ConceptAddFlags>]
  add: []
}>()

const { t } = useI18n()

function onToggle(key: keyof ConceptAddFlags, value: boolean | null) {
  emit('update:modelValue', { ...props.modelValue, [key]: !!value })
}
</script>

<style scoped>
.concept-add-options {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.concept-add-options__flags {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--atlas-color-outline);
  border-radius: 6px;
  background-color: var(--atlas-color-surface-variant);
}

/* Without this the controls shrink to equal widths and "Descendants" wraps to
   a second line, leaving the three flags on different baselines. */
.concept-add-options__flags :deep(.v-selection-control) {
  flex: 0 0 auto;
}

.concept-add-options__flags :deep(.v-label) {
  white-space: nowrap;
  opacity: 1;
}

.concept-add-options__caption {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--atlas-color-on-surface-variant);
}
</style>
