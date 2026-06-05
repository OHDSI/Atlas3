<script setup lang="ts">
import AtlasCard from './AtlasCard.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasCard"
    group="top"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasCard"
        description="Elevated surface container with brand radius, shadow and padding presets. Renders as any tag and can be made interactive."
        :props="[
          { name: 'tag', type: 'string', default: `'div'`, description: 'Element to render (e.g. div, a, button).' },
          { name: 'interactive', type: 'boolean', default: 'false', description: 'Adds hover lift, pointer cursor and focus ring.' },
          { name: 'padding', type: `'none'|'sm'|'md'|'lg'`, default: 'md', description: 'Internal padding preset.' },
        ]"
        :slots="[{ name: 'default', description: 'Card content.' }]"
        usage="<AtlasCard padding=&quot;lg&quot; interactive>Content</AtlasCard>"
      />
    </Variant>

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
