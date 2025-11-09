<template>
  <v-text-field
    :model-value="modelValue"
    class="cohort-search"
    :placeholder="t('common.filterCohorts', 'Filter cohorts...').value"
    prepend-inner-icon="mdi-magnify"
    clearable
    variant="outlined"
    density="comfortable"
    hide-details
    :aria-label="t('common.searchCohorts', 'Search cohorts by name').value"
    @update:model-value="handleInput"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

interface Props {
  modelValue: string
  debounceMs?: number
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  debounceMs: 300,
})

const emit = defineEmits<Emits>()

const debounceTimer = ref<number | null>(null)

/**
 * Handle input with debounce
 * Waits for user to stop typing before emitting
 */
function handleInput(value: string | null) {
  // Clear existing timer
  if (debounceTimer.value !== null) {
    clearTimeout(debounceTimer.value)
  }

  // Set new timer
  debounceTimer.value = setTimeout(() => {
    emit('update:modelValue', value || '')
  }, props.debounceMs) as unknown as number
}

// Cleanup on unmount
watch(() => debounceTimer.value, (newTimer, oldTimer) => {
  if (oldTimer !== null && oldTimer !== newTimer) {
    clearTimeout(oldTimer)
  }
})
</script>

<style scoped>
.cohort-search {
  max-width: 600px;
}
</style>
