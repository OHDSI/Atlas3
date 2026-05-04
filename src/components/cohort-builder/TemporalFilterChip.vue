<template>
  <v-chip
    size="small"
    color="orange"
    variant="outlined"
    :closable="closable"
    style="cursor: pointer"
    data-testid="temporal-filter-chip"
    @click:close="$emit('close')"
  >
    <AtlasIcon
      start
      size="small"
    >
      mdi-clock-outline
    </AtlasIcon>
    <slot>{{ label }}</slot>
  </v-chip>
</template>

<script setup lang="ts">
import { AtlasIcon } from '@/components/ui'
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
