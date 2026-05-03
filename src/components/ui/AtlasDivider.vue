<!-- src/components/ui/AtlasDivider.vue -->
<template>
  <v-divider v-bind="$attrs">
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </v-divider>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
