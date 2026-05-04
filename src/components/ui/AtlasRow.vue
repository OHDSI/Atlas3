<!-- src/components/ui/AtlasRow.vue -->
<template>
  <v-row v-bind="$attrs">
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </v-row>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
