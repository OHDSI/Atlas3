<script setup lang="ts">
import AtlasRow from './AtlasRow.vue'
import AtlasCol from './AtlasCol.vue'
</script>

<template>
  <Story
    title="AtlasRow"
    group="components"
  >
    <Variant title="default">
      <AtlasRow>
        <AtlasCol style="background: rgba(127,127,127,0.15); padding: 12px;">
          Column A
        </AtlasCol>
        <AtlasCol style="background: rgba(127,127,127,0.3); padding: 12px;">
          Column B
        </AtlasCol>
      </AtlasRow>
    </Variant>
  </Story>
</template>
