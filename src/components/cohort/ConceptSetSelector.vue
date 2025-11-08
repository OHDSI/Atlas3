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
                {{ conceptSet.items.length }} concept{{ conceptSet.items.length === 1 ? '' : 's' }}
              </v-chip>
            </div>
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <v-text-field
              :model-value="conceptSet.name"
              label="Name"
              variant="outlined"
              density="compact"
              @update:model-value="conceptSet.id && updateConceptSetName(conceptSet.id, $event)"
            />

            <div v-if="conceptSet.items.length > 0" class="mt-3">
              <p class="text-subtitle-2 mb-2">Concepts:</p>
              <v-chip
                v-for="concept in conceptSet.items"
                :key="concept.conceptId"
                closable
                class="mr-2 mb-2"
                @click:close="conceptSet.id && removeConcept(conceptSet.id, concept.conceptId)"
              >
                {{ concept.conceptName }}
              </v-chip>
            </div>

            <div class="mt-3 d-flex gap-2">
              <v-btn
                color="primary"
                variant="outlined"
                size="small"
                @click="conceptSet.id && openSearchDialog(conceptSet.id)"
              >
                <v-icon class="mr-2">mdi-plus</v-icon>
                Add Concepts
              </v-btn>

              <v-btn
                color="error"
                variant="outlined"
                size="small"
                @click="conceptSet.id && deleteConceptSet(conceptSet.id)"
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
    items: [],
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

  const updatedItems = conceptSet.items.filter(item => item.conceptId !== conceptId)

  conceptSetsStore.addConceptSet({
    ...conceptSet,
    items: updatedItems,
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

  // Add new concepts as items, avoiding duplicates
  const existingIds = new Set(conceptSet.items.map(item => item.conceptId))
  const newItems = concepts
    .filter(c => !existingIds.has(c.conceptId))
    .map(c => ({
      conceptId: c.conceptId,
      conceptName: c.conceptName,
      conceptCode: c.conceptCode,
      domainId: c.domainId,
      vocabularyId: c.vocabularyId,
      conceptClassId: c.conceptClassId,
      standardConcept: c.standardConcept,
      invalidReason: c.invalidReason,
      isExcluded: false,
      includeDescendants: false,
      includeMapped: false,
    }))

  conceptSetsStore.addConceptSet({
    ...conceptSet,
    items: [...conceptSet.items, ...newItems],
  })

  currentConceptSetId.value = null
}
</script>
