<script setup lang="ts">
import AtlasBadge from './AtlasBadge.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasBadge"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasBadge"
        description="Thin wrapper over Vuetify's VBadge. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: '…VBadge props', type: 'see Vuetify VBadge', default: '—', description: 'All VBadge props are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'The element the badge is attached to.' }, { name: 'badge', description: 'Custom badge content.' }]"
        usage="<AtlasBadge :content=&quot;3&quot; color=&quot;error&quot;><AtlasIcon icon=&quot;mdi-bell&quot; /></AtlasBadge>"
      />
    </Variant>

    <Variant title="default">
      <AtlasBadge
        content="3"
        color="error"
      >
        <span style="padding:8px 12px;">Inbox</span>
      </AtlasBadge>
    </Variant>
  </Story>
</template>
