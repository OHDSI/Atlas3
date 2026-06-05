<script setup lang="ts">
import AtlasProgressLinear from './AtlasProgressLinear.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasProgressLinear"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasProgressLinear"
        description="Thin wrapper over Vuetify's VProgressLinear. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: '…VProgressLinear props', type: 'see Vuetify VProgressLinear', default: '—', description: 'All VProgressLinear props are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'Content rendered inside the bar; receives { value }.' }]"
        usage="<AtlasProgressLinear :model-value=&quot;40&quot; />"
      />
    </Variant>

    <Variant title="default">
      <AtlasProgressLinear
        :model-value="40"
        color="primary"
      />
    </Variant>

    <Variant title="indeterminate">
      <AtlasProgressLinear
        indeterminate
        color="primary"
      />
    </Variant>
  </Story>
</template>
