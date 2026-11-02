<template>
  <v-navigation-drawer
    v-if="target"
    :model-value="true"
    data-testid="cc-fa-panel"
    location="right"
    temporary
    :width="drawerWidth"
    :scrim="!conceptSetsStore.editorOpen"
    @update:model-value="onDrawerModelValue"
  >
    <div class="fa-editor-panel__body">
      <FeatureAnalysisEditor
        :key="targetKey"
        ref="editor"
        embedded
        :feature-analysis-id="featureAnalysisId"
        :create-kind="createKind"
        :save-label="saveLabel"
        @saved="(fa, created) => emit('saved', fa, created)"
        @close="emit('closed')"
      />
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import FeatureAnalysisEditor from '@/components/feature-analyses/FeatureAnalysisEditor.vue'
import { useI18n } from '@/composables/useI18n'
import type { FeatureAnalysis } from '@/models/feature-analysis.types'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { FeatureAnalysisCreateKind } from '@/utils/feature-analysis-create-kind'

type PanelTarget = { featureAnalysisId: number } | { createKind: FeatureAnalysisCreateKind }

const props = defineProps<{
  target: PanelTarget | null
}>()

const emit = defineEmits<{
  saved: [fa: FeatureAnalysis, created: boolean]
  closed: []
}>()

const { t } = useI18n()
const conceptSetsStore = useConceptSetsStore()

const editor = ref<{ requestClose: () => void } | null>(null)
const drawerWidth = ref<number>(560)

function updateDrawerWidth() {
  drawerWidth.value = Math.min(window.innerWidth, Math.max(560, Math.floor(window.innerWidth * 0.7)))
}

onMounted(() => {
  updateDrawerWidth()
  window.addEventListener('resize', updateDrawerWidth)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateDrawerWidth)
})

const featureAnalysisId = computed<number | null>(() =>
  props.target && 'featureAnalysisId' in props.target ? props.target.featureAnalysisId : null,
)

const createKind = computed<FeatureAnalysisCreateKind | null>(() =>
  props.target && 'createKind' in props.target ? props.target.createKind : null,
)

const targetKey = computed(() => {
  if (createKind.value) {
    const kind = createKind.value
    return `create:${kind.type}:${'statType' in kind ? kind.statType : ''}`
  }
  return `edit:${featureAnalysisId.value}`
})

const saveLabel = computed(() =>
  createKind.value ? t('featureAnalyses.editor.saveAndAdd').value : undefined,
)

function onDrawerModelValue(value: boolean) {
  if (!value) editor.value?.requestClose()
}
</script>

<style scoped>
.fa-editor-panel__body {
  height: 100%;
  overflow-y: auto;
}
</style>
