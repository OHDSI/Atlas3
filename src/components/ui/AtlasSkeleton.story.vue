<script setup lang="ts">
import AtlasSkeleton from './AtlasSkeleton.vue'
</script>

<template>
  <Story
    title="AtlasSkeleton"
    group="components"
  >
    <Variant title="text">
      <AtlasSkeleton type="text" />
    </Variant>

    <Variant title="card">
      <AtlasSkeleton type="card" />
    </Variant>
  </Story>
</template>
