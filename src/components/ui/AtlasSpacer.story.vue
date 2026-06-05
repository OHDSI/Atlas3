<script setup lang="ts">
import AtlasSpacer from './AtlasSpacer.vue'
</script>

<template>
  <Story
    title="AtlasSpacer"
    group="tier-b"
  >
    <Variant title="default">
      <div style="display: flex; align-items: center;">
        <span>Left</span>
        <AtlasSpacer />
        <span>Right</span>
      </div>
    </Variant>
  </Story>
</template>
