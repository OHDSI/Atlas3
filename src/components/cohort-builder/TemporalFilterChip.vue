<template>
  <AtlasChip
    size="sm"
    tone="warning"
    variant="outlined"
    :closable="closable"
    style="cursor: pointer"
    data-testid="temporal-filter-chip"
    @close="$emit('close')"
  >
    <AtlasIcon
      start
      size="small"
    >
      mdi-clock-outline
    </AtlasIcon>
    <slot>{{ label }}</slot>
  </AtlasChip>
</template>

<script setup lang="ts">
import { AtlasChip, AtlasIcon } from '@/components/ui'
interface Props {
  label?: string
  closable?: boolean
}

withDefaults(defineProps<Props>(), {
  label: '',
  closable: true,
})

defineEmits<{
  close: []
}>()
</script>
