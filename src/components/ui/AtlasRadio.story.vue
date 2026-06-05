<script setup lang="ts">
import { ref } from 'vue'
import AtlasRadio from './AtlasRadio.vue'

const selected = ref('a')
</script>

<template>
  <Story
    title="AtlasRadio"
    group="components"
  >
    <Variant title="inside v-radio-group">
      <v-radio-group v-model="selected">
        <AtlasRadio
          value="a"
          label="Option A"
        />
        <AtlasRadio
          value="b"
          label="Option B"
        />
        <AtlasRadio
          value="c"
          label="Option C (disabled)"
          disabled
        />
      </v-radio-group>
    </Variant>
  </Story>
</template>
