<template>
  <v-card
    class="chart-section"
    variant="outlined"
  >
    <v-card-title class="text-h6 bg-grey-lighten-4">
      {{ title }}
    </v-card-title>
    <v-card-text>
      <v-skeleton-loader
        v-if="loading"
        type="image"
        height="300"
      />
      
      <v-alert
        v-else-if="error"
        type="error"
        variant="tonal"
      >
        {{ error }}
      </v-alert>
      
      <div
        v-else
        class="chart-section__content"
      >
        <slot />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
interface Props {
  title: string
  loading?: boolean
  error?: string | null
}

withDefaults(defineProps<Props>(), {
  loading: false,
  error: null
})
</script>

<style scoped>
.chart-section__content {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
