<script setup lang="ts">
import AtlasSpacer from './AtlasSpacer.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasSpacer"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasSpacer"
        description="Thin wrapper over Vuetify's VSpacer. Forwards all attributes unchanged; renders a flex spacer that pushes sibling content apart inside a flex container."
        :props="[{ name: '…VSpacer props', type: 'see Vuetify VSpacer', default: '—', description: 'All VSpacer props are forwarded via attrs.' }]"
        usage="<div style=&quot;display:flex&quot;><span>Left</span><AtlasSpacer /><span>Right</span></div>"
      />
    </Variant>

    <Variant title="default">
      <div style="display: flex; align-items: center;">
        <span>Left</span>
        <AtlasSpacer />
        <span>Right</span>
      </div>
    </Variant>
  </Story>
</template>
