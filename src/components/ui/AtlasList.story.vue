<script setup lang="ts">
import AtlasList from './AtlasList.vue'
import AtlasListItem from './AtlasListItem.vue'
</script>

<template>
  <Story
    title="AtlasList"
    group="tier-b"
  >
    <Variant title="default">
      <AtlasList>
        <AtlasListItem>
          One
        </AtlasListItem>
        <AtlasListItem>
          Two
        </AtlasListItem>
        <AtlasListItem>
          Three
        </AtlasListItem>
      </AtlasList>
    </Variant>
  </Story>
</template>
