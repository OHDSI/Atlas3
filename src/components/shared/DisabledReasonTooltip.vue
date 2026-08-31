<template>
  <AtlasTooltip
    v-if="reason"
    :location="location"
  >
    <template #activator="{ props: tipProps }">
      <!-- The span is what makes this work. A disabled control receives no
           pointer events, so a tooltip bound directly to it never opens; the
           wrapper is what the pointer actually hits. `title` carries the same
           text for anyone not hovering with a mouse, since the tooltip itself
           renders into an overlay only on hover. -->
      <span
        v-bind="tipProps"
        :title="reason"
        class="disabled-reason-tooltip"
        data-testid="disabled-reason-wrap"
      >
        <slot />
      </span>
    </template>
    <span>{{ reason }}</span>
  </AtlasTooltip>
  <slot v-else />
</template>

<script setup lang="ts">
import { AtlasTooltip } from '@/components/ui'

withDefaults(
  defineProps<{
    /** Empty renders the slot untouched, so callers need no v-if of their own. */
    reason?: string
    location?: 'top' | 'bottom' | 'start' | 'end'
  }>(),
  { reason: '', location: 'bottom' }
)
</script>

<style scoped>
.disabled-reason-tooltip {
  display: inline-flex;
}
</style>
