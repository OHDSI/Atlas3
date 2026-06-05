<script setup lang="ts">
import { ref } from 'vue'
import AtlasPagination from './AtlasPagination.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'

const page = ref(1)
</script>

<template>
  <Story
    title="AtlasPagination"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasPagination"
        description="Thin wrapper over Vuetify's VPagination. Forwards all attributes and slots unchanged, but pins density to &quot;compact&quot; (a passed density attr is stripped and ignored)."
        :props="[{ name: 'density', type: 'string', default: '\'compact\'', description: 'Pinned to compact on the underlying VPagination; a passed density attr is stripped and ignored.' }, { name: '…VPagination props', type: 'see Vuetify VPagination', default: '—', description: 'All other VPagination props (length, v-model, total-visible…) are forwarded via attrs.' }]"
        :slots="[{ name: 'item', description: 'Custom rendering for an individual page item.' }]"
        usage="<AtlasPagination v-model=&quot;page&quot; :length=&quot;5&quot; />"
      />
    </Variant>

    <Variant title="default">
      <AtlasPagination
        v-model="page"
        :length="5"
      />
    </Variant>
  </Story>
</template>
