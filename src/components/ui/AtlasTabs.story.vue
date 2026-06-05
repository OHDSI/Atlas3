<script setup lang="ts">
import { ref } from 'vue'
import AtlasTabs from './AtlasTabs.vue'
import AtlasTab from './AtlasTab.vue'

const tab = ref('a')
</script>

<template>
  <Story
    title="AtlasTabs"
    group="tier-b"
  >
    <Variant title="default">
      <AtlasTabs v-model="tab">
        <AtlasTab value="a">
          First
        </AtlasTab>
        <AtlasTab value="b">
          Second
        </AtlasTab>
        <AtlasTab value="c">
          Third
        </AtlasTab>
      </AtlasTabs>
    </Variant>
  </Story>
</template>
