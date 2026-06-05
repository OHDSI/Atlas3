<script setup lang="ts">
import AtlasBanner from './AtlasBanner.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasBanner"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasBanner"
        description="Thin wrapper over Vuetify's VBanner. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: '…VBanner props', type: 'see Vuetify VBanner', default: '—', description: 'All VBanner props are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'Banner body content.' }, { name: 'prepend', description: 'Leading content such as an icon or avatar.' }, { name: 'actions', description: 'Trailing action buttons.' }]"
        usage="<AtlasBanner text=&quot;A banner message&quot; />"
      />
    </Variant>

    <Variant title="default">
      <AtlasBanner text="A banner message" />
    </Variant>
  </Story>
</template>
