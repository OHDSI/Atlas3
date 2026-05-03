<!-- src/components/ui/AtlasIcon.vue -->
<template>
  <v-icon v-bind="$attrs">
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </v-icon>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
