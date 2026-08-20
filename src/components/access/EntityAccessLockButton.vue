<template>
  <AtlasIconButton
    icon="mdi-lock"
    v-bind="{ ariaLabel, ...forwardAttrs }"
    :disabled="disabled"
    :loading="loading"
    variant="text"
    size="sm"
    @click="$emit('click', $event)"
  />
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { AtlasIconButton } from '@/components/ui'

interface Props {
  ariaLabel: string
  disabled?: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  disabled: false,
  loading: false,
})

defineEmits<{
  click: [event: MouseEvent]
}>()

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const forwardAttrs = computed(() => attrs)
</script>