<template>
  <!-- eslint-disable vue/no-restricted-html-elements -->
  <v-btn
    :icon="icon"
    :color="color"
    :aria-label="ariaLabel"
    :title="ariaLabel"
    :disabled="disabled"
    size="large"
    elevation="6"
    class="atlas-fab"
    v-bind="$attrs"
    @click="$emit('click', $event)"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: string
    ariaLabel: string
    color?: string
    disabled?: boolean
  }>(),
  {
    color: 'primary',
    disabled: false,
  }
)

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<style scoped>
.atlas-fab {
  width: 56px !important;
  height: 56px !important;
  border-radius: 28px !important;
}
</style>
