<!--
  "From Reusable" button for a criteria editor. Renders nothing unless an
  ancestor provides a reusable insert host (see reusable-insert-host.ts). On
  insert it adds what the host needs (the reusable's concept sets, and its
  catalog entry when it is used by reference) and emits the criteria for the
  caller to place.
-->
<template>
  <template v-if="host">
    <AtlasButton
      variant="secondary"
      size="sm"
      prepend-icon="mdi-puzzle-plus-outline"
      :data-testid="testid"
      @click="open = true"
    >
      {{ t('reusables.insert.button') }}
    </AtlasButton>
    <ReusableInsertDialog
      v-if="open"
      v-model="open"
      :type="type"
      :host-concept-sets="host.getConceptSets()"
      :catalog-root="host.getCatalogRoot?.() ?? null"
      @insert="onInsert"
      @insert-reference="onInsertReference"
    />
  </template>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AtlasButton } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { ReusableDesign, ReusableType } from '@/models/reusable.types'
import type { ReusableInstance } from './reusable-design'
import { importReusable, materialize } from './reusable-catalog'
import type { ReusableSource } from './reusable-reference'
import { useReusableInsertHost } from './reusable-insert-host'
import ReusableInsertDialog from './ReusableInsertDialog.vue'

withDefaults(
  defineProps<{
    type: ReusableType
    testid?: string
  }>(),
  { testid: 'reusable-insert-button' }
)

const emit = defineEmits<{
  insert: [instance: ReusableInstance]
}>()

const { t } = useI18n()
const host = useReusableInsertHost()
const open = ref(false)

function onInsert(instance: ReusableInstance) {
  if (!host) return
  for (const conceptSet of instance.conceptSets) {
    host.addConceptSet(conceptSet)
  }
  emit('insert', instance)
  host.onInserted?.()
}

function onInsertReference({ design, source }: { design: ReusableDesign; source: ReusableSource }) {
  const root = host?.getCatalogRoot?.()
  if (!host || !root) return
  const { kind, entry } = importReusable(root, design, source)
  const use = materialize(entry, kind, host.getConceptSets())
  for (const conceptSet of use.conceptSets) host.addConceptSet(conceptSet)
  emit('insert', {
    conceptSets: [],
    byReference: true,
    ...(use.criteriaGroup ? { criteriaGroup: use.criteriaGroup } : {}),
    ...(use.criteria ? { criteriaList: [use.criteria] } : {}),
  })
  host.onInserted?.()
}
</script>
