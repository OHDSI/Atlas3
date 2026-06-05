<script setup lang="ts">
import AtlasCard from './AtlasCard.vue'
</script>

<template>
  <Story
    title="AtlasCard"
    group="components"
  >
    <Variant title="default">
      <AtlasCard>Default card with medium padding.</AtlasCard>
    </Variant>

    <Variant title="padding presets">
      <div style="display:grid; gap:16px;">
        <AtlasCard padding="none">
          none — caller controls spacing
        </AtlasCard>
        <AtlasCard padding="sm">
          sm — 16px
        </AtlasCard>
        <AtlasCard padding="md">
          md — 20px (default)
        </AtlasCard>
        <AtlasCard padding="lg">
          lg — 32px
        </AtlasCard>
      </div>
    </Variant>

    <Variant title="interactive">
      <AtlasCard interactive>
        Hover for the lift effect.
      </AtlasCard>
    </Variant>

    <Variant title="as anchor">
      <AtlasCard
        tag="a"
        href="#"
        interactive
      >
        Renders as an anchor — clickable.
      </AtlasCard>
    </Variant>
  </Story>
</template>
