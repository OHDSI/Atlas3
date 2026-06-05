<script setup lang="ts">
import AtlasCol from './AtlasCol.vue'
import AtlasRow from './AtlasRow.vue'
</script>

<template>
  <Story
    title="AtlasCol"
    group="tier-b"
  >
    <Variant title="default">
      <AtlasRow>
        <AtlasCol
          cols="6"
          style="background: rgba(127,127,127,0.15);"
        >
          Left
        </AtlasCol>
        <AtlasCol
          cols="6"
          style="background: rgba(127,127,127,0.3);"
        >
          Right
        </AtlasCol>
      </AtlasRow>
    </Variant>
  </Story>
</template>
