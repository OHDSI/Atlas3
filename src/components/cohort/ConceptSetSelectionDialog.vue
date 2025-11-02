<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-book-open-variant</v-icon>
        <span>Select Concept Set</span>
        <v-spacer />
        <v-btn
          icon
          size="small"
          variant="text"
          @click="close"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <p v-if="conceptSetsList.length === 0" class="text-body-2 text-medium-emphasis text-center py-8">
          <v-icon size="48" class="mb-2">mdi-book-open-variant</v-icon>
          <br>
          No concept sets available. Create a concept set first in the right panel.
        </p>

        <v-list v-else>
          <v-list-item
            v-for="conceptSet in conceptSetsList"
            :key="conceptSet.id"
            @click="selectConceptSet(conceptSet.id)"
          >
            <template #prepend>
              <v-icon>mdi-book-open-variant</v-icon>
            </template>

            <v-list-item-title>{{ conceptSet.name }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ conceptSet.concepts.length }} concept{{ conceptSet.concepts.length === 1 ? '' : 's' }}
            </v-list-item-subtitle>

            <template #append>
              <v-icon>mdi-chevron-right</v-icon>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="close"
        >
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConceptSetsStore } from '@/stores/conceptSets'

interface Props {
  modelValue: boolean
  eventId: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'concept-set-selected': [conceptSetId: number | string]
}>()

const conceptSetsStore = useConceptSetsStore()

const conceptSetsList = computed(() => {
  return Array.from(conceptSetsStore.conceptSets.values())
})

function selectConceptSet(conceptSetId: number | string) {
  emit('concept-set-selected', conceptSetId)
  close()
}

function close() {
  emit('update:modelValue', false)
}
</script>
