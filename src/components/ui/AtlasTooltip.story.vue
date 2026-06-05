<script setup lang="ts">
import AtlasTooltip from './AtlasTooltip.vue'
import AtlasButton from './AtlasButton.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasTooltip"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasTooltip"
        description="Thin wrapper over Vuetify's VTooltip. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: '…VTooltip props', type: 'see Vuetify VTooltip', default: '—', description: 'All VTooltip props (text, location, open-delay…) are forwarded via attrs.' }]"
        :slots="[{ name: 'activator', description: 'Element that triggers the tooltip; receives { props } to bind.' }, { name: 'default', description: 'Tooltip content (overrides the text prop).' }]"
        usage="<AtlasTooltip text=&quot;Hello&quot;><template #activator=&quot;{ props }&quot;><AtlasButton v-bind=&quot;props&quot;>Hover</AtlasButton></template></AtlasTooltip>"
      />
    </Variant>

    <Variant title="default">
      <AtlasTooltip text="A helpful tooltip">
        <template #activator="{ props }">
          <AtlasButton v-bind="props">
            Hover me
          </AtlasButton>
        </template>
      </AtlasTooltip>
    </Variant>
  </Story>
</template>
