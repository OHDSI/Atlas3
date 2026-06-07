<!-- src/components/ui/AtlasSelect.story.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import AtlasSelect from './AtlasSelect.vue'

const ITEMS = [
  { title: 'Alpha', value: 'a' },
  { title: 'Beta',  value: 'b' },
  { title: 'Gamma', value: 'c' },
  { title: 'Delta', value: 'd' },
]

const single = ref<string | null>(null)
const multi  = ref<string[]>([])
</script>

<template>
  <Story
    title="AtlasSelect"
    group="components"
  >
    <Variant title="default">
      <AtlasSelect
        v-model="single"
        :items="ITEMS"
        label="Pick one"
      />
    </Variant>

    <Variant title="multiple">
      <AtlasSelect
        v-model="multi"
        :items="ITEMS"
        multiple
        label="Pick many"
      />
    </Variant>

    <Variant title="clearable">
      <AtlasSelect
        v-model="single"
        :items="ITEMS"
        label="Pick one"
        clearable
      />
    </Variant>

    <Variant title="required">
      <AtlasSelect
        v-model="single"
        :items="ITEMS"
        label="Pick one"
        required
      />
    </Variant>

    <Variant title="with error">
      <AtlasSelect
        v-model="single"
        :items="ITEMS"
        label="Pick one"
        required
        :error="'Selection required'"
      />
    </Variant>

    <Variant title="disabled">
      <AtlasSelect
        v-model="single"
        :items="ITEMS"
        label="Frozen"
        disabled
      />
    </Variant>
  </Story>
</template>
