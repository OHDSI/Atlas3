<template>
  <AtlasTextField
    :model-value="modelValue"
    class="cohort-search"
    :placeholder="t('datatable.language.searchPlaceholder', 'Filter cohorts...').value"
    prepend-icon="mdi-magnify"
    clearable
    variant="outlined"
    hide-details
    :aria-label="t('datatable.language.search', 'Search cohorts by name').value"
    @update:model-value="(v) => handleInput(v as string | null)"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { AtlasTextField } from '@/components/ui'
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
watch(
  () => debounceTimer.value,
  (newTimer, oldTimer) => {
    if (oldTimer !== null && oldTimer !== newTimer) {
      clearTimeout(oldTimer)
    }
  }
)
</script>

<style scoped>
.cohort-search {
  max-width: 600px;
}
</style>
