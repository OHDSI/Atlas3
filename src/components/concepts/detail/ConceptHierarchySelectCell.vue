<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

defineProps<{
  conceptId: number
  conceptName: string
  canAdd: boolean
  selected: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

const { tv } = useI18n()
</script>

<template>
  <td>
    <v-checkbox-btn
      v-if="canAdd"
      :model-value="selected"
      :aria-label="tv('components.conceptTable.selectConcept', 'Select {name}', { name: conceptName })"
      density="compact"
      hide-details
      :data-testid="`hierarchy-select-${conceptId}`"
      @update:model-value="emit('toggle')"
    />
  </td>
</template>
