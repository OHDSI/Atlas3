<script setup lang="ts">
import { ref } from 'vue'
import AtlasPagination from './AtlasPagination.vue'

const page = ref(1)
</script>

<template>
  <Story
    title="AtlasPagination"
    group="components"
  >
    <Variant title="default">
      <AtlasPagination
        v-model="page"
        :length="5"
      />
    </Variant>
  </Story>
</template>
