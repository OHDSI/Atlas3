<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useConceptDetailDrawerStore } from '@/stores/concept-detail-drawer'
import { AtlasIconButton } from '@/components/ui'
import ConceptDetailContent from '@/components/concepts/detail/ConceptDetailContent.vue'

const drawer = useConceptDetailDrawerStore()
const { isOpen, sourceKey, conceptId } = storeToRefs(drawer)

const drawerOpen = computed({
  get: () => isOpen.value,
  set: (v: boolean) => {
    if (!v) drawer.close()
  },
})

// Match the ConceptSetEditor drawer width so the two panels look aligned.
const drawerWidth = computed(() => {
  if (typeof window === 'undefined') return 1100
  return window.innerWidth - 100
})
</script>

<template>
  <Teleport to="body">
    <v-navigation-drawer
      v-model="drawerOpen"
      location="right"
      temporary
      :width="drawerWidth"
      class="concept-detail-drawer"
    >
      <div class="drawer-shell">
        <div class="drawer-toolbar">
          <AtlasIconButton
            icon="mdi-close"
            variant="text"
            size="sm"
            v-bind="{ ariaLabel: 'Close concept details' }"
            data-testid="concept-drawer-close"
            @click="drawer.close()"
          />
        </div>

        <ConceptDetailContent
          v-if="isOpen && sourceKey && conceptId"
          :source-key="sourceKey"
          :concept-id="conceptId"
        />
      </div>
    </v-navigation-drawer>
  </Teleport>
</template>

<style>
.v-navigation-drawer__scrim {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
}
</style>

<style scoped>
.concept-detail-drawer {
  background: rgb(var(--v-theme-background));
}
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
