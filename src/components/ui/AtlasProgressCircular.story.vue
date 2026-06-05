<script setup lang="ts">
import AtlasProgressCircular from './AtlasProgressCircular.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasProgressCircular"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasProgressCircular"
        description="Thin wrapper over Vuetify's VProgressCircular. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: '…VProgressCircular props', type: 'see Vuetify VProgressCircular', default: '—', description: 'All VProgressCircular props are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'Content rendered inside the circle (e.g. a percentage label).' }]"
        usage="<AtlasProgressCircular :model-value=&quot;60&quot; :size=&quot;32&quot; />"
      />
    </Variant>

    <Variant title="default">
      <AtlasProgressCircular
        :model-value="60"
        :size="48"
        color="primary"
      />
    </Variant>

    <Variant title="indeterminate">
      <AtlasProgressCircular
        indeterminate
        color="primary"
      />
    </Variant>
  </Story>
</template>
