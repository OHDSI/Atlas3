<script setup lang="ts">
import AtlasAvatar from './AtlasAvatar.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasAvatar"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasAvatar"
        description="Thin wrapper over Vuetify's VAvatar. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: '…VAvatar props', type: 'see Vuetify VAvatar', default: '—', description: 'All VAvatar props are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'Avatar content (initials, image, or icon).' }]"
        usage="<AtlasAvatar color=&quot;primary&quot; size=&quot;40&quot;>AB</AtlasAvatar>"
      />
    </Variant>

    <Variant title="default">
      <AtlasAvatar
        color="primary"
        size="40"
      >
        AB
      </AtlasAvatar>
    </Variant>
  </Story>
</template>
