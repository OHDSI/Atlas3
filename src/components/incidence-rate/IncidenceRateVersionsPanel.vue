<template>
  <VersionsTabContent
    v-if="versionsConfig"
    :config="versionsConfig"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import VersionsTabContent from '@/components/versions/VersionsTabContent.vue'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import type { VersionsConfig, VersionsTableItem } from '@/components/versions/types'

const props = defineProps<{ irId: number }>()

const store = useIncidenceRateStore()
const { currentIR, previewVersion, isDirty, isPreviewMode } = storeToRefs(store)

const canEdit = computed(() => !isPreviewMode.value)
const isDirtyRef = computed(() => isDirty.value)

const versionsConfig = computed<VersionsConfig | null>(() => {
  const ir = currentIR.value
  if (!ir?.id) return null

  const current: VersionsTableItem = {
    version: 0,
    assetId: ir.id,
    createdBy: { id: 0, name: '' },
    createdDate:
      typeof ir.createdDate === 'string'
        ? ir.createdDate
        : typeof ir.createdDate === 'number'
          ? new Date(ir.createdDate).toISOString()
          : '',
    comment: null,
    archived: false,
    displayVersion: 'Current',
    isCurrent: true,
    isPreviewing: false,
    formattedDate: '',
  }

  return {
    assetType: 'ir',
    assetId: props.irId,
    currentVersion: () => current,
    previewVersion,
    canEdit,
    isDirty: isDirtyRef,
    clearPreview: () => store.clearPreviewVersion(),
  }
})
</script>
