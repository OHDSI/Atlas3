<!-- src/components/ui/AtlasCol.vue -->
<template>
  <v-col v-bind="$attrs">
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </v-col>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
