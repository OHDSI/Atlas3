<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2">mdi-book-open-variant</v-icon>
      <span>Concept Sets</span>
      <v-spacer />
      <v-btn
        color="primary"
        variant="outlined"
        size="small"
        @click="createNewConceptSet"
      >
        <v-icon class="mr-2">mdi-plus</v-icon>
        New Concept Set
      </v-btn>
    </v-card-title>

    <v-card-text>
      <p v-if="conceptSetsList.length === 0" class="text-body-2 text-medium-emphasis">
        No concept sets defined. Click "New Concept Set" to create one.
      </p>

      <v-expansion-panels v-else>
        <v-expansion-panel
          v-for="conceptSet in conceptSetsList"
          :key="conceptSet.id"
        >
          <v-expansion-panel-title>
            <div class="d-flex align-center w-100">
              <span class="font-weight-medium">{{ conceptSet.name }}</span>
              <v-spacer />
              <v-chip size="small" class="mr-2">
                {{ conceptSet.concepts.length }} concept{{ conceptSet.concepts.length === 1 ? '' : 's' }}
              </v-chip>
            </div>
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <v-text-field
              :model-value="conceptSet.name"
              label="Name"
              variant="outlined"
              density="compact"
              @update:model-value="updateConceptSetName(conceptSet.id, $event)"
            />

            <div v-if="conceptSet.concepts.length > 0" class="mt-3">
              <p class="text-subtitle-2 mb-2">Concepts:</p>
              <v-chip
                v-for="concept in conceptSet.concepts"
                :key="concept.conceptId"
                closable
                class="mr-2 mb-2"
                @click:close="removeConcept(conceptSet.id, concept.conceptId)"
              >
                {{ concept.conceptName }}
              </v-chip>
            </div>

            <div class="mt-3 d-flex gap-2">
              <v-btn
                color="primary"
                variant="outlined"
                size="small"
                @click="openSearchDialog(conceptSet.id)"
              >
                <v-icon class="mr-2">mdi-plus</v-icon>
                Add Concepts
              </v-btn>

              <v-btn
                color="error"
                variant="outlined"
                size="small"
                @click="deleteConceptSet(conceptSet.id)"
              >
                <v-icon class="mr-2">mdi-delete</v-icon>
                Delete
              </v-btn>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>

  <concept-search-dialog
    v-model="isSearchDialogOpen"
    @concepts-selected="handleConceptsSelected"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { ConceptSet, Concept } from '@/models/concept-set.types'
import { useConceptSetsStore } from '@/stores/conceptSets'
import ConceptSearchDialog from './ConceptSearchDialog.vue'

const conceptSetsStore = useConceptSetsStore()

const isSearchDialogOpen = ref(false)
const currentConceptSetId = ref<number | string | null>(null)

const conceptSetsList = computed(() => {
  return Array.from(conceptSetsStore.conceptSets.values())
})

function createNewConceptSet() {
  const newConceptSet: ConceptSet = {
    id: uuidv4(),
    name: `Concept Set ${conceptSetsList.value.length + 1}`,
    concepts: [],
  }

  conceptSetsStore.addConceptSet(newConceptSet)
}

function updateConceptSetName(id: number | string, newName: string) {
  const conceptSet = conceptSetsStore.conceptSets.get(id)
  if (!conceptSet) return

  conceptSetsStore.addConceptSet({
    ...conceptSet,
    name: newName,
  })
}

function removeConcept(conceptSetId: number | string, conceptId: number) {
  const conceptSet = conceptSetsStore.conceptSets.get(conceptSetId)
  if (!conceptSet) return

  const updatedConcepts = conceptSet.concepts.filter(c => c.conceptId !== conceptId)

  conceptSetsStore.addConceptSet({
    ...conceptSet,
    concepts: updatedConcepts,
  })
}

function deleteConceptSet(id: number | string) {
  conceptSetsStore.removeConceptSet(id)
}

function openSearchDialog(conceptSetId: number | string) {
  currentConceptSetId.value = conceptSetId
  isSearchDialogOpen.value = true
}

function handleConceptsSelected(concepts: Concept[]) {
  if (!currentConceptSetId.value) return

  const conceptSet = conceptSetsStore.conceptSets.get(currentConceptSetId.value)
  if (!conceptSet) return

  // Add new concepts, avoiding duplicates
  const existingIds = new Set(conceptSet.concepts.map(c => c.conceptId))
  const newConcepts = concepts.filter(c => !existingIds.has(c.conceptId))

  conceptSetsStore.addConceptSet({
    ...conceptSet,
    concepts: [...conceptSet.concepts, ...newConcepts],
  })

  currentConceptSetId.value = null
}
</script>
