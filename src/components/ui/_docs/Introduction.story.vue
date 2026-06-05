<script setup lang="ts">
import AtlasStoryDocs from '../_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="Introduction"
    group="top"
    :docs-only="true"
  >
    <Variant title="Getting started">
      <AtlasStoryDocs
        name="Atlas UI"
        description="The Atlas3 design system: design tokens, a Vuetify theme, and ~40 Atlas* components. Use these to build Atlas3 views and plugins that look native and support light + dark themes."
        usage="import { AtlasButton, buildVuetifyOptions } from '@ohdsi/atlas-ui'
import '@ohdsi/atlas-ui/style.css'"
        :dos="['Import components and the theme from @ohdsi/atlas-ui.', 'Use --atlas-* CSS variables for custom styling so dark mode follows automatically.', 'See the Plugin Guide to build an Atlas3 extension.']"
        :donts="[`Don't hardcode hex colors — use tokens or --v-theme-* / --atlas-* vars.`]"
      />
    </Variant>
  </Story>
</template>
