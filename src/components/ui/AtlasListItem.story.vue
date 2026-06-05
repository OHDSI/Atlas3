<script setup lang="ts">
import AtlasList from './AtlasList.vue'
import AtlasListItem from './AtlasListItem.vue'
</script>

<template>
  <Story
    title="AtlasListItem"
    group="components"
  >
    <Variant title="default">
      <AtlasList>
        <AtlasListItem title="Inbox" />
        <AtlasListItem title="Archived" />
      </AtlasList>
    </Variant>
  </Story>
</template>
