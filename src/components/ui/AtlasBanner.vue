<!-- src/components/ui/AtlasBanner.vue -->
<template>
  <v-banner v-bind="$attrs">
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </v-banner>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
