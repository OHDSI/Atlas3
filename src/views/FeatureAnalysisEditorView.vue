<template>
  <FeatureAnalysisEditor
    v-if="target"
    :key="target.key"
    :feature-analysis-id="target.featureAnalysisId"
    :create-kind="target.createKind"
    @saved="onSaved"
    @close="onClose"
  />
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import FeatureAnalysisEditor from '@/components/feature-analyses/FeatureAnalysisEditor.vue'
import type { FeatureAnalysis } from '@/models/feature-analysis.types'
import { parseCreateKind, type FeatureAnalysisCreateKind } from '@/utils/feature-analysis-create-kind'

const props = defineProps<{
  id?: string
}>()

const route = useRoute()
const router = useRouter()

interface EditorTarget {
  key: string
  featureAnalysisId: number | null
  createKind: FeatureAnalysisCreateKind | null
}

function resolveTarget(): EditorTarget | null {
  const key = route.fullPath
  if (props.id) {
    const numericId = Number(props.id)
    return Number.isNaN(numericId) ? null : { key, featureAnalysisId: numericId, createKind: null }
  }
  const createKind = parseCreateKind(route.query.type, route.query.statType)
  return createKind ? { key, featureAnalysisId: null, createKind } : null
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

function onSaved(fa: FeatureAnalysis) {
  router.push(`/feature-analyses/${fa.id}`)
}

function onClose() {
  router.push('/feature-analyses')
}
</script>
