<script setup lang="ts">
import AtlasButton from './AtlasButton.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasButton"
    group="tier-a"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasButton"
        description="Brand-styled action button wrapping Vuetify's VBtn with semantic variants, sizes, tones, loading and icon support."
        :props="[
          { name: 'variant', type: `'primary'|'secondary'|'tonal'|'danger'|'ghost'|'link'`, default: 'primary', description: 'Visual style.' },
          { name: 'size', type: `'xs'|'sm'|'md'|'lg'`, default: 'md', description: 'Button size.' },
          { name: 'tone', type: `'primary'|'neutral'|'warning'|'danger'|'success'|'info'`, default: 'undefined', description: 'Overrides color independent of variant.' },
          { name: 'loading', type: 'boolean', default: 'false', description: 'Shows a spinner and disables interaction.' },
          { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the button.' },
          { name: 'icon', type: 'string', default: 'undefined', description: 'MDI icon name.' },
          { name: 'iconPosition', type: `'start'|'end'`, default: 'start', description: 'Icon side.' },
          { name: 'type', type: `'button'|'submit'|'reset'`, default: 'button', description: 'Native button type.' },
          { name: 'toggle', type: 'boolean', default: 'false', description: 'Acts as a toggle button (color/variant defer to a parent button group).' },
        ]"
        :events="[{ name: 'click', payload: 'MouseEvent', description: 'Emitted when the button is activated.' }]"
        :slots="[{ name: 'default', description: 'Button label content.' }]"
        usage="<AtlasButton variant=&quot;primary&quot; icon=&quot;mdi-plus&quot;>Add</AtlasButton>"
        :dos="['Use one primary button per view for the main action.', 'Use danger only for destructive actions.']"
        :donts="[`Don't use link variant for primary actions.`, `Don't pack more than ~3 buttons in a row.`]"
      />
    </Variant>

    <Variant title="variants">
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <AtlasButton variant="primary">
          Primary
        </AtlasButton>
        <AtlasButton variant="secondary">
          Secondary
        </AtlasButton>
        <AtlasButton variant="danger">
          Danger
        </AtlasButton>
        <AtlasButton variant="ghost">
          Ghost
        </AtlasButton>
        <AtlasButton variant="link">
          Link
        </AtlasButton>
      </div>
    </Variant>

    <Variant title="sizes">
      <div style="display:flex; gap:12px; align-items:center;">
        <AtlasButton size="sm">
          Small
        </AtlasButton>
        <AtlasButton size="md">
          Medium
        </AtlasButton>
        <AtlasButton size="lg">
          Large
        </AtlasButton>
      </div>
    </Variant>

    <Variant title="states">
      <div style="display:flex; gap:12px;">
        <AtlasButton>Default</AtlasButton>
        <AtlasButton loading>
          Loading
        </AtlasButton>
        <AtlasButton disabled>
          Disabled
        </AtlasButton>
      </div>
    </Variant>

    <Variant title="with icon">
      <div style="display:flex; gap:12px;">
        <AtlasButton icon="mdi-plus">
          Add
        </AtlasButton>
        <AtlasButton
          icon="mdi-arrow-right"
          icon-position="end"
          variant="secondary"
        >
          Continue
        </AtlasButton>
        <AtlasButton
          icon="mdi-delete"
          variant="danger"
        >
          Delete
        </AtlasButton>
      </div>
    </Variant>
  </Story>
</template>
