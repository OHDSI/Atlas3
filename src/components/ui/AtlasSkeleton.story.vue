<script setup lang="ts">
import AtlasSkeleton from './AtlasSkeleton.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasSkeleton"
    group="tier-b"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasSkeleton"
        description="Thin wrapper over Vuetify's VSkeletonLoader. Forwards all attributes and slots unchanged; exists so consumers import from atlas-ui rather than Vuetify directly."
        :props="[{ name: '…VSkeletonLoader props', type: 'see Vuetify VSkeletonLoader', default: '—', description: 'All VSkeletonLoader props (type, loading…) are forwarded via attrs.' }]"
        :slots="[{ name: 'default', description: 'Content shown once loading is complete.' }]"
        usage="<AtlasSkeleton type=&quot;card&quot; />"
      />
    </Variant>

    <Variant title="text">
      <AtlasSkeleton type="text" />
    </Variant>

    <Variant title="card">
      <AtlasSkeleton type="card" />
    </Variant>
  </Story>
</template>
