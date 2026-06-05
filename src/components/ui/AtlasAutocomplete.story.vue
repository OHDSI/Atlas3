<!-- src/components/ui/AtlasAutocomplete.story.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import AtlasAutocomplete from './AtlasAutocomplete.vue'

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
    title="AtlasAutocomplete"
    group="components"
  >
    <Variant title="default">
      <AtlasAutocomplete
        v-model="single"
        :items="ITEMS"
        label="Pick one"
      />
    </Variant>

    <Variant title="multiple">
      <AtlasAutocomplete
        v-model="multi"
        :items="ITEMS"
        multiple
        label="Pick many"
      />
    </Variant>

    <Variant title="clearable">
      <AtlasAutocomplete
        v-model="single"
        :items="ITEMS"
        label="Pick one"
        clearable
      />
    </Variant>

    <Variant title="required">
      <AtlasAutocomplete
        v-model="single"
        :items="ITEMS"
        label="Pick one"
        required
      />
    </Variant>

    <Variant title="with error">
      <AtlasAutocomplete
        v-model="single"
        :items="ITEMS"
        label="Pick one"
        required
        :error="'Selection required'"
      />
    </Variant>

    <Variant title="disabled">
      <AtlasAutocomplete
        v-model="single"
        :items="ITEMS"
        label="Frozen"
        disabled
      />
    </Variant>

    <Variant title="no-filter (async-style)">
      <AtlasAutocomplete
        v-model="single"
        :items="ITEMS"
        label="Pick one"
        no-filter
      />
    </Variant>
  </Story>
</template>
