<script setup lang="ts">
import AtlasProgressLinear from './AtlasProgressLinear.vue'
</script>

<template>
  <Story
    title="AtlasProgressLinear"
    group="components"
  >
    <Variant title="default">
      <AtlasProgressLinear
        :model-value="40"
        color="primary"
      />
    </Variant>

    <Variant title="indeterminate">
      <AtlasProgressLinear
        indeterminate
        color="primary"
      />
    </Variant>
  </Story>
</template>
