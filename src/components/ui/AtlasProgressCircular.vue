<!-- src/components/ui/AtlasProgressCircular.vue -->
<template>
  <v-progress-circular v-bind="$attrs">
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </v-progress-circular>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
