<script setup lang="ts">
import AtlasBadge from './AtlasBadge.vue'
</script>

<template>
  <Story
    title="AtlasBadge"
    group="components"
  >
    <Variant title="default">
      <AtlasBadge
        content="3"
        color="error"
      >
        <span style="padding:8px 12px;">Inbox</span>
      </AtlasBadge>
    </Variant>
  </Story>
</template>
