<!-- src/components/ui/AtlasBadge.vue -->
<template>
  <v-badge v-bind="$attrs">
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </v-badge>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
