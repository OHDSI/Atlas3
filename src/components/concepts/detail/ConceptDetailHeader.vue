<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useConceptDetailDrawerStore } from '@/stores/concept-detail-drawer'
import { AtlasButton, AtlasChip, AtlasIconButton } from '@/components/ui'
import type { Concept } from '@/models/concept-set.types'

const props = defineProps<{ concept: Concept }>()
const emit = defineEmits<{
  'add-to-concept-set': [concept: Concept]
  'copy-id': [conceptId: number]
}>()

const router = useRouter()
const drawer = useConceptDetailDrawerStore()

function onBack() {
  // When the header is rendered inside the drawer, "back" closes the drawer
  // rather than triggering a router navigation.
  if (drawer.isOpen) {
    drawer.close()
    return
  }
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/concepts')
  }
}

const standardLabel = computed(() => {
  switch (props.concept.standardConcept) {
    case 'S':
      return 'Standard'
    case 'C':
      return 'Classification'
    default:
      return 'Non-standard'
  }
})

const standardTone = computed(() =>
  props.concept.standardConcept === 'S' ? ('success' as const) : undefined,
)

function onAdd() {
  emit('add-to-concept-set', props.concept)
}

async function onCopy() {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(String(props.concept.conceptId))
  }
  emit('copy-id', props.concept.conceptId)
}
</script>

<template>
  <div
    class="concept-detail-header"
    data-testid="concept-detail-header"
  >
    <AtlasIconButton
      icon="mdi-arrow-left"
      variant="text"
      size="sm"
      v-bind="{ ariaLabel: 'Go back' }"
      data-testid="concept-detail-back"
      @click="onBack"
    />
    <div class="concept-title-row">
      <h1 class="concept-title">
        {{ concept.conceptName }}
      </h1>
      <div class="concept-chips">
        <AtlasChip
          :tone="standardTone"
          size="sm"
        >
          {{ standardLabel }}
        </AtlasChip>
        <AtlasChip size="sm">
          {{ concept.vocabularyId }}
        </AtlasChip>
        <AtlasChip size="sm">
          {{ concept.conceptId }}
        </AtlasChip>
        <AtlasChip size="sm">
          {{ concept.domainId }}
        </AtlasChip>
        <AtlasChip size="sm">
          {{ concept.conceptClassId }}
        </AtlasChip>
      </div>
    </div>

    <div class="concept-actions">
      <AtlasButton
        variant="primary"
        size="sm"
        icon="mdi-plus"
        data-testid="add-to-concept-set"
        @click="onAdd"
      >
        Add to Concept Set
      </AtlasButton>
      <AtlasButton
        variant="secondary"
        size="sm"
        icon="mdi-content-copy"
        data-testid="copy-concept-id"
        @click="onCopy"
      >
        Copy ID
      </AtlasButton>
    </div>
  </div>
</template>

<style scoped>
.concept-detail-header {
  position: sticky;
  top: 0;
  z-index: 5;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.concept-title-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.concept-title {
  font-size: 18px;
  font-weight: 500;
  margin: 0;
}
.concept-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.concept-actions {
  display: flex;
  gap: 6px;
}
</style>
