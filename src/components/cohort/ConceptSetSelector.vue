<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <AtlasIcon class="mr-2">
        mdi-book-open-variant
      </AtlasIcon>
      <span>{{ t('cs.browser.caption') }}</span>
      <AtlasSpacer />
      <v-btn
        color="primary"
        variant="outlined"
        size="small"
        @click="createNewConceptSet"
      >
        <AtlasIcon class="mr-2">
          mdi-plus
        </AtlasIcon>
        {{ t('components.conceptSetBuilder.newConceptSet') }}
      </v-btn>
    </v-card-title>

    <v-card-text>
      <p
        v-if="conceptSetsList.length === 0"
        class="text-body-2 text-medium-emphasis"
      >
        {{ t('cohortDefinitions.noConceptSets') }}
      </p>

      <v-expansion-panels v-else>
        <v-expansion-panel
          v-for="conceptSet in conceptSetsList"
          :key="conceptSet.id"
        >
          <v-expansion-panel-title>
            <div class="d-flex align-center w-100">
              <span class="font-weight-medium">{{ conceptSet.name }}</span>
              <AtlasSpacer />
              <AtlasChip
                size="sm"
                class="mr-2"
              >
                {{ t('conceptSets.conceptCount', { count: conceptSet.items.length }) }}
              </AtlasChip>
            </div>
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <AtlasTextField
              :model-value="conceptSet.name"
              :label="tv('columns.name')"
              variant="outlined"
              @update:model-value="(v) => conceptSet.id && updateConceptSetName(conceptSet.id, String(v))"
            />

            <div
              v-if="conceptSet.items.length > 0"
              class="mt-3"
            >
              <p class="text-subtitle-2 mb-2">
                {{ t('conceptSets.concepts') }}
              </p>
              <AtlasChip
                v-for="concept in conceptSet.items"
                :key="concept.conceptId"
                closable
                class="mr-2 mb-2"
                @close="conceptSet.id && removeConcept(conceptSet.id, concept.conceptId)"
              >
                {{ concept.conceptName }}
              </AtlasChip>
            </div>

            <div class="mt-3 d-flex gap-2">
              <v-btn
                color="primary"
                variant="outlined"
                size="small"
                @click="conceptSet.id && openSearchDialog(conceptSet.id)"
              >
                <AtlasIcon class="mr-2">
                  mdi-plus
                </AtlasIcon>
                {{ t('components.conceptSet.addConcepts') }}
              </v-btn>

              <v-btn
                color="error"
                variant="outlined"
                size="small"
                @click="conceptSet.id && deleteConceptSet(conceptSet.id)"
              >
                <AtlasIcon class="mr-2">
                  mdi-delete
                </AtlasIcon>
                {{ t('common.delete') }}
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
import { AtlasChip, AtlasIcon, AtlasSpacer, AtlasTextField } from '@/components/ui'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import type { ConceptSet, Concept } from '@/models/concept-set.types'
import { useConceptPickerStore } from '@/stores/concept-picker'
import ConceptSearchDialog from './ConceptSearchDialog.vue'

const { t, tv } = useI18n()

const conceptPickerStore = useConceptPickerStore()

const isSearchDialogOpen = ref(false)
const currentConceptSetId = ref<number | string | null>(null)

const conceptSetsList = computed(() => {
  return Array.from(conceptPickerStore.conceptSets.values())
})

function createNewConceptSet() {
  const newConceptSet: ConceptSet = {
    id: uuidv4(),
    name: tv('conceptSets.defaultName', { number: conceptSetsList.value.length + 1 }),
    items: [],
  }

  conceptPickerStore.addConceptSet(newConceptSet)
}

function updateConceptSetName(id: number | string, newName: string) {
  const conceptSet = conceptPickerStore.conceptSets.get(id)
  if (!conceptSet) return

  conceptPickerStore.addConceptSet({
    ...conceptSet,
    name: newName,
  })
}

function removeConcept(conceptSetId: number | string, conceptId: number) {
  const conceptSet = conceptPickerStore.conceptSets.get(conceptSetId)
  if (!conceptSet) return

  const updatedItems = conceptSet.items.filter(item => item.conceptId !== conceptId)

  conceptPickerStore.addConceptSet({
    ...conceptSet,
    items: updatedItems,
  })
}

function deleteConceptSet(id: number | string) {
  conceptPickerStore.removeConceptSet(id)
}

function openSearchDialog(conceptSetId: number | string) {
  currentConceptSetId.value = conceptSetId
  isSearchDialogOpen.value = true
}

function handleConceptsSelected(concepts: Concept[]) {
  if (!currentConceptSetId.value) return

  const conceptSet = conceptPickerStore.conceptSets.get(currentConceptSetId.value)
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

  conceptPickerStore.addConceptSet({
    ...conceptSet,
    items: [...conceptSet.items, ...newItems],
  })

  currentConceptSetId.value = null
}
</script>
