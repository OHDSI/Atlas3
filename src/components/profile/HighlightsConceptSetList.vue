<template>
  <div class="highlights-concept-set-list">
    <div
      v-if="store.cohortConceptSets.length === 0"
      data-test="cs-empty"
      class="text-disabled"
    >
      {{ tv('profiles.clickHereToSelectACohort', 'No cohort selected') }}
    </div>
    <v-list
      v-else
      density="compact"
    >
      <v-list-item
        v-for="cs in store.cohortConceptSets"
        :key="cs.id"
        :title="cs.name"
        :prepend-icon="selected.has(cs.id) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline'"
        @click="toggle(cs.id)"
      />
    </v-list>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useProfileStore } from '@/stores/profile'
import { useI18n } from '@/composables/useI18n'

const store = useProfileStore()
const { tv } = useI18n()

const emit = defineEmits<{ (e: 'selectionChange', ids: number[]): void }>()
const selected = ref<Set<number>>(new Set())

function toggle(id: number) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
  emit('selectionChange', Array.from(next))
}
</script>
