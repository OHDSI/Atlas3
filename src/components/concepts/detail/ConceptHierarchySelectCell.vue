<script setup lang="ts">
defineProps<{
  conceptId: number
  canAdd: boolean
  selected: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <td>
    <v-checkbox-btn
      v-if="canAdd"
      :model-value="selected"
      density="compact"
      hide-details
      :data-testid="`hierarchy-select-${conceptId}`"
      @update:model-value="emit('toggle')"
    />
  </td>
</template>
