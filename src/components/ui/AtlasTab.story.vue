<script setup lang="ts">
import { ref } from 'vue'
import AtlasTabs from './AtlasTabs.vue'
import AtlasTab from './AtlasTab.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'

const tab = ref('a')
</script>

<template>
  <Story
    title="AtlasTab"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasTab"
        description="Thin wrapper over Vuetify's VTab. Represents a single tab inside an AtlasTabs container. Forwards all attributes and slots unchanged."
        :props="[{ name: '…VTab props', type: 'see Vuetify VTab', default: '—', description: 'All VTab props (value, disabled, prepend-icon…) are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'Tab label content.' }]"
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
      </AtlasTabs>
    </Variant>
  </Story>
</template>
