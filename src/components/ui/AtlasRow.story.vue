<script setup lang="ts">
import AtlasRow from './AtlasRow.vue'
import AtlasCol from './AtlasCol.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasRow"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasRow"
        description="Thin wrapper over Vuetify's VRow. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: '…VRow props', type: 'see Vuetify VRow', default: '—', description: 'All VRow props (no-gutters, align, justify…) are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'Grid columns (typically AtlasCol).' }]"
        usage="<AtlasRow><AtlasCol>A</AtlasCol><AtlasCol>B</AtlasCol></AtlasRow>"
      />
    </Variant>

    <Variant title="default">
      <AtlasRow>
        <AtlasCol style="background: rgba(127,127,127,0.15); padding: 12px;">
          Column A
        </AtlasCol>
        <AtlasCol style="background: rgba(127,127,127,0.3); padding: 12px;">
          Column B
        </AtlasCol>
      </AtlasRow>
    </Variant>
  </Story>
</template>
