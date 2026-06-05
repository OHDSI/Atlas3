<script setup lang="ts">
import AtlasIcon from './AtlasIcon.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasIcon"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasIcon"
        description="Thin wrapper over Vuetify's VIcon. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: '…VIcon props', type: 'see Vuetify VIcon', default: '—', description: 'All VIcon props are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'Icon name when not passed via the icon prop.' }]"
        usage="<AtlasIcon icon=&quot;mdi-bell&quot; color=&quot;primary&quot; />"
      />
    </Variant>

    <Variant title="default">
      <AtlasIcon
        icon="mdi-bell"
        color="primary"
      />
    </Variant>
  </Story>
</template>
