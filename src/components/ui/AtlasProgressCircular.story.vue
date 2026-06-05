<script setup lang="ts">
import AtlasProgressCircular from './AtlasProgressCircular.vue'
</script>

<template>
  <Story
    title="AtlasProgressCircular"
    group="components"
  >
    <Variant title="default">
      <AtlasProgressCircular
        :model-value="60"
        :size="48"
        color="primary"
      />
    </Variant>

    <Variant title="indeterminate">
      <AtlasProgressCircular
        indeterminate
        color="primary"
      />
    </Variant>
  </Story>
</template>
