<template>
  <AtlasMenu>
    <template #activator="{ props: menuProps }">
      <AtlasButton
        v-bind="menuProps"
        variant="secondary"
        size="sm"
        icon="mdi-menu-down"
        icon-position="end"
        class="inclusion-choice"
        :aria-label="label"
        :data-testid="testid"
      >
        {{ current?.title }}
      </AtlasButton>
    </template>
    <AtlasList density="compact">
      <AtlasListItem
        v-for="item in items"
        :key="item.value"
        :active="item.value === modelValue"
        :data-testid="`${testid}-${item.value}`"
        @click="emit('update:modelValue', item.value)"
      >
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </AtlasListItem>
    </AtlasList>
  </AtlasMenu>
</template>

<script setup lang="ts" generic="T extends string">
import { computed } from 'vue'
import { AtlasButton, AtlasList, AtlasListItem, AtlasMenu } from '@/components/ui'

// Inline dropdown for the Atlas 2 style sentence
// "Having [any] of the selected rules [passed]".
const props = defineProps<{
  modelValue: T
  items: { value: T; title: string }[]
  label: string
  testid: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()

const current = computed(() => props.items.find(i => i.value === props.modelValue))
</script>

<style scoped>
.inclusion-choice {
  text-transform: none;
  letter-spacing: normal;
  margin: 0 4px;
}
</style>
