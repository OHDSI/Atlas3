<template>
  <v-navigation-drawer
    v-model="open"
    location="right"
    permanent
    width="320"
    class="highlights-panel"
    data-test="highlights-panel"
  >
    <v-tabs
      v-model="tab"
      density="compact"
    >
      <v-tab
        value="concepts"
        data-test="highlights-tab-concepts"
      >
        {{ tv('profiles.eventHighlighting', 'Concepts') }}
      </v-tab>
      <v-tab
        value="sets"
        data-test="highlights-tab-sets"
        :disabled="!store.hasCohortContext"
      >
        Sets
      </v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="concepts">
        <HighlightsConceptList @selection-change="onSelectionChange" />
      </v-window-item>
      <v-window-item value="sets">
        <HighlightsConceptSetList @selection-change="onSetSelectionChange" />
      </v-window-item>
    </v-window>

    <v-divider class="my-2" />
    <HighlightColorPicker
      @select="onApplyColor"
      @clear="onClearAll"
    />
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import HighlightsConceptList from '@/components/profile/HighlightsConceptList.vue'
import HighlightsConceptSetList from '@/components/profile/HighlightsConceptSetList.vue'
import HighlightColorPicker from '@/components/profile/HighlightColorPicker.vue'
import { useProfileStore } from '@/stores/profile'
import { useI18n } from '@/composables/useI18n'
import type { HighlightColor } from '@/models/profile.types'

const store = useProfileStore()
const { tv } = useI18n()

const open = ref(true)
const tab = ref<'concepts' | 'sets'>('concepts')
const selectedConceptIds = ref<number[]>([])
const selectedSetIds = ref<number[]>([])

function onSelectionChange(ids: number[]) { selectedConceptIds.value = ids }
function onSetSelectionChange(ids: number[]) { selectedSetIds.value = ids }

function onApplyColor(color: HighlightColor) {
  if (selectedConceptIds.value.length > 0) {
    store.applyHighlight(selectedConceptIds.value, color)
  }
  // Concept-set application: future task — needs concept-id expansion. v1: no-op.
}

function onClearAll() { store.clearHighlights() }

defineExpose({ onSelectionChange, onSetSelectionChange, onApplyColor })
</script>
