<template>
  <div
    class="empty-report-state text-center py-8"
    data-testid="empty-report-state"
  >
    <v-icon
      :icon="icon"
      size="48"
      class="mb-4 text-grey"
    />
    <p class="text-body-1 font-weight-medium">
      {{ title }}
    </p>
    <p
      v-if="subtitle"
      class="text-body-2 text-grey-darken-1 mt-1"
    >
      {{ subtitle }}
    </p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    icon?: string
  }>(),
  {
    subtitle: undefined,
    icon: 'mdi-database-off'
  }
)
</script>

<style scoped>
.empty-report-state {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>
