<script setup lang="ts">
import AtlasCol from './AtlasCol.vue'
import AtlasRow from './AtlasRow.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasCol"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasCol"
        description="Thin wrapper over Vuetify's VCol grid column. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: '…VCol props', type: 'see Vuetify VCol', default: '—', description: 'All VCol props are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'Column content.' }]"
        usage="<AtlasRow><AtlasCol cols=&quot;6&quot;>Left</AtlasCol><AtlasCol cols=&quot;6&quot;>Right</AtlasCol></AtlasRow>"
      />
    </Variant>

    <Variant title="default">
      <AtlasRow>
        <AtlasCol
          cols="6"
          style="background: rgba(127,127,127,0.15);"
        >
          Left
        </AtlasCol>
        <AtlasCol
          cols="6"
          style="background: rgba(127,127,127,0.3);"
        >
          Right
        </AtlasCol>
      </AtlasRow>
    </Variant>
  </Story>
</template>
