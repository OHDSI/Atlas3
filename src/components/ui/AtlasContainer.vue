<!-- src/components/ui/AtlasContainer.vue -->
<template>
  <v-container v-bind="$attrs">
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </v-container>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
