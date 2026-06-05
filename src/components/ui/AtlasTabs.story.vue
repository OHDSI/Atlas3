<script setup lang="ts">
import { ref } from 'vue'
import AtlasTabs from './AtlasTabs.vue'
import AtlasTab from './AtlasTab.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'

const tab = ref('a')
</script>

<template>
  <Story
    title="AtlasTabs"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasTabs"
        description="Thin wrapper over Vuetify's VTabs. Forwards all attributes and slots unchanged, but pins density to &quot;compact&quot; (a passed density attr is stripped and ignored). Holds AtlasTab children and the selected value via v-model."
        :props="[{ name: 'density', type: 'string', default: '\'compact\'', description: 'Pinned to compact on the underlying VTabs; a passed density attr is stripped and ignored.' }, { name: '…VTabs props', type: 'see Vuetify VTabs', default: '—', description: 'All other VTabs props (v-model, grow, color…) are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'The AtlasTab items.' }]"
        usage="<AtlasTabs v-model=&quot;tab&quot;><AtlasTab value=&quot;a&quot;>First</AtlasTab></AtlasTabs>"
      />
    </Variant>

    <Variant title="default">
      <AtlasTabs v-model="tab">
        <AtlasTab value="a">
          First
        </AtlasTab>
        <AtlasTab value="b">
          Second
        </AtlasTab>
        <AtlasTab value="c">
          Third
        </AtlasTab>
      </AtlasTabs>
    </Variant>
  </Story>
</template>
