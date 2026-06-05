<script setup lang="ts">
import AtlasList from './AtlasList.vue'
import AtlasListItem from './AtlasListItem.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasList"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasList"
        description="Thin wrapper over Vuetify's VList. Forwards all attributes and slots unchanged, but pins density to &quot;compact&quot; (a passed density attr is stripped and ignored). Exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: 'density', type: 'string', default: '\'compact\'', description: 'Pinned to compact on the underlying VList; a passed density attr is ignored.' }, { name: '…VList props', type: 'see Vuetify VList', default: '—', description: 'All other VList props are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'List items (e.g. AtlasListItem children).' }]"
        usage="<AtlasList><AtlasListItem>One</AtlasListItem><AtlasListItem>Two</AtlasListItem></AtlasList>"
      />
    </Variant>

    <Variant title="default">
      <AtlasList>
        <AtlasListItem>
          One
        </AtlasListItem>
        <AtlasListItem>
          Two
        </AtlasListItem>
        <AtlasListItem>
          Three
        </AtlasListItem>
      </AtlasList>
    </Variant>
  </Story>
</template>
