<script setup lang="ts">
import AtlasDivider from './AtlasDivider.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasDivider"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasDivider"
        description="Thin wrapper over Vuetify's VDivider. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: '…VDivider props', type: 'see Vuetify VDivider', default: '—', description: 'All VDivider props are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'Optional inline content rendered within the divider.' }]"
        usage="<AtlasDivider />"
      />
    </Variant>

    <Variant title="default">
      <div>
        <p>Above the divider</p>
        <AtlasDivider style="margin: 16px 0;" />
        <p>Below the divider</p>
      </div>
    </Variant>
  </Story>
</template>
