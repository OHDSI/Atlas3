<template>
  <button
    type="button"
    class="sort-header-button"
    :class="{ 'sort-header-button--active': direction }"
    @click="emit('sort')"
  >
    <span class="sort-header-button__label">{{ label }}</span>
    <AtlasIcon
      :icon="icon"
      size="14"
      class="sort-header-button__icon"
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasIcon } from '@/components/ui'
import type { SortDirection } from '@/composables/useSortedPage'

const props = defineProps<{
  label: string
  direction: SortDirection | null
}>()

const emit = defineEmits<{ sort: [] }>()

const icon = computed(() => {
  if (props.direction === 'asc') return 'mdi-arrow-up'
  if (props.direction === 'desc') return 'mdi-arrow-down'
  return 'mdi-swap-vertical'
})
</script>

<style scoped>
.sort-header-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: inherit;
  cursor: pointer;
}

.sort-header-button:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.sort-header-button__icon {
  opacity: 0.35;
}

.sort-header-button:hover .sort-header-button__icon,
.sort-header-button--active .sort-header-button__icon {
  opacity: 1;
}

.sort-header-button--active {
  color: rgb(var(--v-theme-primary));
}
</style>
