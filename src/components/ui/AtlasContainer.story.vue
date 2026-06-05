<script setup lang="ts">
import AtlasContainer from './AtlasContainer.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasContainer"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasContainer"
        description="Thin wrapper over Vuetify's VContainer layout element. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: '…VContainer props', type: 'see Vuetify VContainer', default: '—', description: 'All VContainer props are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'Container content.' }]"
        usage="<AtlasContainer>Page content</AtlasContainer>"
      />
    </Variant>

    <Variant title="default">
      <AtlasContainer style="background: rgba(127,127,127,0.15);">
        Page content
      </AtlasContainer>
    </Variant>
  </Story>
</template>
