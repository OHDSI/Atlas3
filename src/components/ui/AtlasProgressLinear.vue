<!-- src/components/ui/AtlasProgressLinear.vue -->
<template>
  <v-progress-linear v-bind="$attrs">
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </v-progress-linear>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
