<template>
  <section
    class="cs"
    :class="{ 'cs--collapsed': !expanded }"
  >
    <div
      :id="`${id}-header`"
      data-testid="cs-header"
      class="cs__header"
      role="button"
      tabindex="0"
      :aria-expanded="expanded"
      :aria-controls="`${id}-body`"
      @click="toggle"
      @keydown="onKeydown"
    >
      <AtlasIcon
        class="cs__chevron"
        :class="{ 'cs__chevron--collapsed': !expanded }"
        icon="mdi-chevron-down"
        size="18"
      />
      <span
        v-if="badge !== undefined"
        class="cs__badge"
      >{{ badge }}</span>
      <h3 class="cs__title">
        {{ title }}
      </h3>
      <AtlasChip
        v-if="stateChip"
        :tone="stateChip.tone"
        size="sm"
        class="cs__chip"
      >
        {{ stateChip.label }}
      </AtlasChip>
      <span
        v-if="meta"
        class="cs__meta"
      >{{ meta }}</span>
      <AtlasSpacer />
      <span
        v-if="$slots.controls"
        class="cs__slot"
        @click.stop
      >
        <slot name="controls" />
      </span>
      <span
        v-if="$slots.actions"
        class="cs__slot"
        @click.stop
      >
        <slot name="actions" />
      </span>
    </div>
    <div
      v-show="expanded"
      :id="`${id}-body`"
      class="cs__body"
      :aria-hidden="expanded ? undefined : 'true'"
    >
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import AtlasChip from './AtlasChip.vue'
import AtlasIcon from './AtlasIcon.vue'
import AtlasSpacer from './AtlasSpacer.vue'
import type { AtlasChipTone } from './AtlasChip.vue'

interface Props {
  title: string
  defaultExpanded?: boolean
  badge?: string | number
  stateChip?: { label: string; tone: AtlasChipTone }
  meta?: string
}

const props = withDefaults(defineProps<Props>(), {
  defaultExpanded: true,
  badge: undefined,
  stateChip: undefined,
  meta: undefined,
})

const id = useId()
const expanded = ref(props.defaultExpanded)
const userToggled = ref(false)

watch(
  () => props.defaultExpanded,
  next => {
    if (!userToggled.value) expanded.value = next
  }
)

function toggle() {
  userToggled.value = true
  expanded.value = !expanded.value
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggle()
  }
}
</script>

<style scoped>
.cs {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  margin-bottom: 12px;
}

.cs__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.cs--collapsed .cs__header {
  border-bottom: none;
}

.cs__header:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.cs__chevron {
  transition: transform 0.15s ease;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.cs__chevron--collapsed {
  transform: rotate(-90deg);
}

.cs__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  border: 2px solid rgba(var(--v-theme-on-surface), 0.12);
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 12px;
  font-weight: 600;
}

.cs__title {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  margin: 0;
}

.cs__meta {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.cs__slot {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.cs__body {
  padding: 12px 14px 14px;
}
</style>
