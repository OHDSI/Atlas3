<template>
  <div class="concept-set-selection">
    <!--
      Rendered unconditionally. It used to be gated on `IsExclusion !== undefined`,
      but `IsExclusion` is nullish in the schema and nothing backfills it, so a
      selection loaded as `{ "CodesetId": 3 }` — which is perfectly valid — hid
      the chip permanently. `toggleExclude` carried the same guard, so the
      control was unreachable rather than merely invisible, and the only way to
      get it back was to delete and re-add the attribute, losing the CodesetId.
      An unset `IsExclusion` means "any of", which is what the chip now shows.
    -->
    <AtlasChip
      class="concept-set-selection__exclude-chip"
      :color="isExcluded ? 'warning' : 'primary'"
      variant="tonal"
      label
      size="sm"
      @click="toggleExclude"
    >
      {{ isExcluded ? notAnyOfLabel : anyOfLabel }}
    </AtlasChip>

    <EventConceptSet
      :concept-sets="conceptSets"
      :model-value="modelValue"
      :label="label"
      :select-label="selectLabel"
      :compact="compact"
      :picker-test-id="pickerTestId"
      :chip-test-id="chipTestId"
      @select="emit('select', $event)"
      @edit="emit('edit', $event)"
      @clear="emit('clear')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { AtlasChip } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import EventConceptSet from './EventConceptSet.vue'
import type { ConceptSetOption, ConceptSetSelectionTarget } from '../criteria/criteria-editor.types'
import type { ConceptSetSelection } from '@/models/circe-types'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    modelValue: ConceptSetSelection
    conceptSets: ConceptSetOption[]
    label?: string
    selectLabel?: string
    compact?: boolean
    pickerTestId?: string
    chipTestId?: string
  }>(),
  {
    label: undefined,
    selectLabel: undefined,
    compact: false,
    pickerTestId: 'concept-set-picker',
    chipTestId: 'selected-concept-set',
  }
)

const emit = defineEmits<{
  select: [target: ConceptSetSelectionTarget | undefined]
  clear: []
  edit: [target: ConceptSetSelectionTarget | undefined]
}>()

const { modelValue, conceptSets, label, selectLabel, compact, pickerTestId, chipTestId } = toRefs(props)

const anyOfLabel = computed(() => t('components.conceptAddBox.anyOf', 'any of').value)
const notAnyOfLabel = computed(() => t('components.conceptAddBox.notAnyOf', 'not any of').value)

// An unset IsExclusion means the selection is not excluded, the same as false.
const isExcluded = computed(() => modelValue.value.IsExclusion === true)

function toggleExclude() {
  modelValue.value.IsExclusion = !isExcluded.value
}
</script>

<style scoped>
.concept-set-selection {
  display: flex;
  align-items: center;
  gap: 8px;
}

.concept-set-selection__exclude-chip {
  flex: 0 0 auto;
  cursor: pointer;
  text-transform: none;
}
</style>
