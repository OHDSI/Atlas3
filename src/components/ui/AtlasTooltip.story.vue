<script setup lang="ts">
import AtlasTooltip from './AtlasTooltip.vue'
import AtlasButton from './AtlasButton.vue'
</script>

<template>
  <Story
    title="AtlasTooltip"
    group="tier-b"
  >
    <Variant title="default">
      <AtlasTooltip text="A helpful tooltip">
        <template #activator="{ props }">
          <AtlasButton v-bind="props">
            Hover me
          </AtlasButton>
        </template>
      </AtlasTooltip>
    </Variant>
  </Story>
</template>
