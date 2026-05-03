<!-- src/components/ui/AtlasMenu.vue -->
<template>
  <v-menu v-bind="$attrs">
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </v-menu>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
