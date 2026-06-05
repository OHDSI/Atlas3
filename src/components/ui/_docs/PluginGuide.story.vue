<script setup lang="ts">
import AtlasStoryDocs from '../_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="Plugin Guide"
    group="top"
    :docs-only="true"
  >
    <Variant title="Build an Atlas3 plugin">
      <AtlasStoryDocs
        name="Build an Atlas3 plugin with atlas-ui"
        description="Atlas3 plugins are single-spa parcels receiving { name, authContext, messageBus }. Use @ohdsi/atlas-ui so your plugin looks native and supports light + dark. Full reference: plugins-dev/hello-world-plugin."
        usage="// main.ts — install Vuetify with the Atlas theme
import { createVuetify } from 'vuetify'
import { buildVuetifyOptions } from '@ohdsi/atlas-ui'
import '@ohdsi/atlas-ui/style.css'
handleInstance(app) { app.use(createVuetify(buildVuetifyOptions())) }"
        :dos="['Add vue + vuetify as peers and vite-plugin-vuetify to the build.', 'Style with --atlas-* / --v-theme-* vars so dark mode follows the host.', 'Copy plugins-dev/hello-world-plugin as a starting point.']"
        :donts="[`Don't hardcode colors; don't ship your own Vuetify theme that diverges from Atlas.`]"
      />
    </Variant>
  </Story>
</template>
