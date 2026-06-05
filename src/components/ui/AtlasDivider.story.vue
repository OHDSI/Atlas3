<script setup lang="ts">
import AtlasDivider from './AtlasDivider.vue'
</script>

<template>
  <Story
    title="AtlasDivider"
    group="components"
  >
    <Variant title="default">
      <div>
        <p>Above the divider</p>
        <AtlasDivider style="margin: 16px 0;" />
        <p>Below the divider</p>
      </div>
    </Variant>
  </Story>
</template>
