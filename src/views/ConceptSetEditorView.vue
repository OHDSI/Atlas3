<template>
  <AtlasPageShell
    hero
    compact
    :eyebrow="eyebrow"
  >
    <ConceptSetEditor
      v-if="ready"
      :model-value="true"
      :concept-set="conceptSetsStore.currentSet"
      presentation="page"
      @update:model-value="onEditorVisibilityChange"
      @save="onSaved"
      @back-to-current="backToCurrent"
    />
  </AtlasPageShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AtlasPageShell } from '@/components/ui'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useI18n } from '@/composables/useI18n'
import type { ConceptSet } from '@/models/concept-set.types'

const props = defineProps<{
  id?: string
  version?: string
}>()

const router = useRouter()
const conceptSetsStore = useConceptSetsStore()
const { t } = useI18n()
const ready = ref(false)

const isNew = computed(() => !props.id)
const eyebrow = computed(() =>
  isNew.value
    ? t('common.conceptSet').value
    : `${t('common.conceptSet').value} · #${props.id}`
)

watch(
  () => [props.id, props.version],
  () => {
    void loadConceptSet()
  },
  { immediate: true }
)

async function loadConceptSet() {
  ready.value = false

  if (isNew.value) {
    if (!conceptSetsStore.currentSet || conceptSetsStore.currentSet.id !== undefined) {
      conceptSetsStore.openCreateEditor()
    }
    ready.value = true
    return
  }

  const id = Number(props.id)
  if (!Number.isSafeInteger(id) || id <= 0) {
    await router.replace({ name: 'concepts', query: { tab: 'sets' } })
    return
  }

  if (!props.version && conceptSetsStore.previewVersion) {
    await conceptSetsStore.clearPreviewVersion(id)
  } else if (!conceptSetsStore.currentSet || Number(conceptSetsStore.currentSet.id) !== id) {
    await conceptSetsStore.fetchOne(id)
  }

  if (!conceptSetsStore.currentSet) {
    await router.replace({ name: 'concepts', query: { tab: 'sets' } })
    return
  }

  ready.value = true
}

function onEditorVisibilityChange(value: boolean) {
  if (value) return
  conceptSetsStore.closeEditor()
  void router.push({ name: 'concepts', query: { tab: 'sets' } })
}

async function onSaved(conceptSet: ConceptSet) {
  await conceptSetsStore.fetchAll()
  if (conceptSet.id === undefined || conceptSet.id === null) return

  await router.replace({
    name: 'conceptset-edit',
    params: { id: String(conceptSet.id) },
  })
}

async function backToCurrent() {
  if (!props.id) return
  await router.push({
    name: 'conceptset-edit',
    params: { id: props.id },
  })
}
</script>
