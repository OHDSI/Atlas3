<script setup lang="ts">
import AtlasList from './AtlasList.vue'
import AtlasListItem from './AtlasListItem.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasListItem"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasListItem"
        description="Thin wrapper over Vuetify's VListItem. Forwards all attributes and slots unchanged, but pins density to &quot;compact&quot; (a passed density attr is stripped and ignored). Exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: 'density', type: 'string', default: '\'compact\'', description: 'Pinned to compact on the underlying VListItem; a passed density attr is ignored.' }, { name: '…VListItem props', type: 'see Vuetify VListItem', default: '—', description: 'All other VListItem props are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'Item content.' }, { name: 'prepend', description: 'Leading content such as an icon or avatar.' }, { name: 'append', description: 'Trailing content such as an icon or action.' }]"
        usage="<AtlasListItem title=&quot;Inbox&quot; />"
      />
    </Variant>

    <Variant title="default">
      <AtlasList>
        <AtlasListItem title="Inbox" />
        <AtlasListItem title="Archived" />
      </AtlasList>
    </Variant>
  </Story>
</template>
