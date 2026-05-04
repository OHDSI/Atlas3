<!-- src/components/ui/AtlasRadio.vue -->
<template>
  <v-radio
    :value="value"
    :label="label"
    :disabled="disabled"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
interface Props {
  value: string | number
  label?: string
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  label: undefined,
  disabled: false,
})

defineOptions({ inheritAttrs: false })
</script>
