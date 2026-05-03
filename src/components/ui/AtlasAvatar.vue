<!-- src/components/ui/AtlasAvatar.vue -->
<template>
  <v-avatar v-bind="$attrs">
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </v-avatar>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
