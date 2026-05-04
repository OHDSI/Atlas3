<!-- src/components/ui/AtlasSkeleton.vue -->
<template>
  <v-skeleton-loader v-bind="$attrs">
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </v-skeleton-loader>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
