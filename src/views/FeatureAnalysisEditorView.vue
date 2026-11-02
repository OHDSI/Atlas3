<template>
  <FeatureAnalysisEditor
    v-if="target"
    :key="target.key"
    :feature-analysis-id="target.featureAnalysisId"
    :create-kind="target.createKind"
    :save-label="saveLabel"
    :close-label="closeLabel"
    @saved="onSaved"
    @close="onClose"
  />
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import FeatureAnalysisEditor from '@/components/feature-analyses/FeatureAnalysisEditor.vue'
import { useI18n } from '@/composables/useI18n'
import type { FeatureAnalysis } from '@/models/feature-analysis.types'
import { parseCreateKind, type FeatureAnalysisCreateKind } from '@/utils/feature-analysis-create-kind'
import {
  RETURN_TO_QUERY,
  parsePositiveId,
  returnToCharacterizationRoute,
} from '@/utils/feature-analysis-return'

const props = defineProps<{
  id?: string
}>()

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

interface EditorTarget {
  key: string
  featureAnalysisId: number | null
  createKind: FeatureAnalysisCreateKind | null
  returnToId: number | null
}

function resolveTarget(): EditorTarget | null {
  const key = route.fullPath
  const returnToId = parsePositiveId(route.query[RETURN_TO_QUERY])
  if (props.id) {
    const numericId = Number(props.id)
    return Number.isNaN(numericId) ? null : { key, featureAnalysisId: numericId, createKind: null, returnToId }
  }
  const createKind = parseCreateKind(route.query.type, route.query.statType)
  return createKind ? { key, featureAnalysisId: null, createKind, returnToId } : null
}

const target = shallowRef<EditorTarget | null>(resolveTarget())

if (!target.value) {
  if (props.id) {
    router.push('/feature-analyses')
  } else {
    router.replace('/feature-analyses')
  }
}

watch(
  () => [route.fullPath, props.id],
  () => {
    const next = resolveTarget()
    if (next) target.value = next
  }
)

const saveLabel = computed(() =>
  target.value?.returnToId != null && target.value.featureAnalysisId === null
    ? t('featureAnalyses.editor.saveAndAdd').value
    : undefined
)
const closeLabel = computed(() =>
  target.value?.returnToId != null ? t('featureAnalyses.editor.backToCharacterization').value : undefined
)

function onSaved(fa: FeatureAnalysis, created: boolean) {
  const returnToId = target.value?.returnToId ?? null
  if (returnToId !== null && created) {
    router.push(returnToCharacterizationRoute(returnToId, fa.id))
  } else {
    router.push(`/feature-analyses/${fa.id}`)
  }
}

function onClose() {
  const returnToId = target.value?.returnToId ?? null
  router.push(returnToId !== null ? returnToCharacterizationRoute(returnToId) : '/feature-analyses')
}
</script>
