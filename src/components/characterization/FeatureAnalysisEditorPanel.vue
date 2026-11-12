<template>
  <AtlasSideSheet
    v-if="target"
    :model-value="true"
    data-testid="cc-fa-panel"
    @update:model-value="onDrawerModelValue"
  >
    <div
      class="fa-editor-panel__body"
      data-testid="cc-fa-panel-body"
    >
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
  </AtlasSideSheet>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import FeatureAnalysisEditor from '@/components/feature-analyses/FeatureAnalysisEditor.vue'
import { AtlasSideSheet } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { FeatureAnalysis } from '@/models/feature-analysis.types'
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

interface EmbeddedEditor {
  requestClose: () => void
  isDirty: () => boolean
}

const editor = ref<EmbeddedEditor | null>(null)

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

// Escape and scrim clicks only reach this sheet when it is the top-most
// overlay, so a nested concept set editor or confirm prompt handles its own.
function onDrawerModelValue(value: boolean) {
  if (!value) editor.value?.requestClose()
}

defineExpose({
  isDirty: () => editor.value?.isDirty() ?? false,
})
</script>

<style scoped>
.fa-editor-panel__body {
  box-sizing: border-box;
  height: 100%;
  overflow-y: auto;
  padding: 16px 18px 18px;
}
</style>
