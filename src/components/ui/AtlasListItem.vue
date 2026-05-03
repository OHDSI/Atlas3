<!-- src/components/ui/AtlasListItem.vue -->
<template>
  <v-list-item
    density="compact"
    v-bind="forwardAttrs"
  >
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </v-list-item>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const forwardAttrs = computed(() => {
  const { density: _d, ...rest } = attrs as Record<string, unknown>
  void _d
  return rest
})
</script>
