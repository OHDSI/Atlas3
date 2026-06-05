<script setup lang="ts">
import AtlasFab from './AtlasFab.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasFab"
    group="tier-a"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasFab"
        description="Circular floating action button wrapping Vuetify's VBtn in icon mode, fixed at 56px with elevation for a primary page action."
        :props="[
          { name: 'icon', type: 'string', default: '—', description: 'MDI icon name shown in the button (required).' },
          { name: 'ariaLabel', type: 'string', default: '—', description: 'Accessible label and title; the button has no visible text (required).' },
          { name: 'color', type: 'string', default: `'primary'`, description: 'Button color.' },
          { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the button.' },
          { name: '…VBtn props', type: 'see Vuetify VBtn', default: '—', description: 'Additional VBtn props are forwarded via attrs (size and elevation are fixed).' },
        ]"
        :events="[{ name: 'click', payload: 'MouseEvent', description: 'Emitted when the button is activated.' }]"
        usage="<AtlasFab icon=&quot;mdi-plus&quot; aria-label=&quot;Add concept set&quot; @click=&quot;create&quot; />"
        :dos="['Always provide an aria-label since the button has no text.', 'Use one FAB per view for the primary action.']"
        :donts="[`Don't use a FAB for secondary or destructive actions.`]"
      />
    </Variant>

    <Variant title="default">
      <AtlasFab
        icon="mdi-plus"
        aria-label="Add item"
      />
    </Variant>
  </Story>
</template>
