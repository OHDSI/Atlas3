<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useConceptDetailDrawerStore } from '@/stores/concept-detail-drawer'
import { AtlasIconButton, AtlasSideSheet } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import ConceptDetailContent from '@/components/concepts/detail/ConceptDetailContent.vue'

const { tv } = useI18n()

const drawer = useConceptDetailDrawerStore()
const { isOpen, sourceKey, conceptId } = storeToRefs(drawer)

const drawerOpen = computed({
  get: () => isOpen.value,
  set: (v: boolean) => {
    if (!v) drawer.close()
  },
})

function navigate(conceptId: number) {
  if (!sourceKey.value) return
  drawer.open(sourceKey.value, conceptId)
}
</script>

<template>
  <AtlasSideSheet
    v-model="drawerOpen"
    content-class="concept-detail-drawer"
    :aria-label="tv('components.conceptDetail.conceptDetailsTitle')"
  >
    <div class="drawer-shell">
      <div class="drawer-toolbar">
        <AtlasIconButton
          icon="mdi-close"
          variant="text"
          size="sm"
          v-bind="{ ariaLabel: tv('components.conceptDetail.closeDetails') }"
          data-testid="concept-drawer-close"
          @click="drawer.close()"
        />
      </div>

      <ConceptDetailContent
        v-if="isOpen && sourceKey && conceptId"
        :source-key="sourceKey"
        :concept-id="conceptId"
        @navigate="navigate"
      />
    </div>
  </AtlasSideSheet>
</template>

<style>
/* Unscoped: the panel element is rendered by the teleported overlay. */
.atlas-side-sheet__panel.concept-detail-drawer {
  background: rgb(var(--v-theme-background));
}
</style>

<style scoped>
.drawer-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}
.drawer-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px 0;
}
</style>
