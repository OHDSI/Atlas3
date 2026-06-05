<script setup lang="ts">
import AtlasIconButton from './AtlasIconButton.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasIconButton"
    group="tier-a"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasIconButton"
        description="Icon-only button wrapping Vuetify's VBtn with brand variants, sizes and tones. Requires an accessible label."
        :props="[
          { name: 'icon', type: 'string', default: '(required)', description: 'MDI icon name.' },
          { name: 'ariaLabel', type: 'string', default: '(required)', description: 'Accessible label describing the action.' },
          { name: 'variant', type: `'tonal'|'text'|'flat'`, default: 'tonal', description: 'Visual style.' },
          { name: 'size', type: `'sm'|'md'|'lg'`, default: 'md', description: 'Button size.' },
          { name: 'tone', type: `'primary'|'neutral'|'danger'`, default: 'neutral', description: 'Semantic color.' },
          { name: 'loading', type: 'boolean', default: 'false', description: 'Shows a spinner and disables interaction.' },
          { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the button.' },
        ]"
        :events="[{ name: 'click', payload: 'MouseEvent', description: 'Emitted when the button is activated.' }]"
        usage="<AtlasIconButton icon=&quot;mdi-close&quot; aria-label=&quot;Close&quot; tone=&quot;danger&quot; />"
        :dos="['Always provide a descriptive aria-label.']"
      />
    </Variant>

    <Variant title="variants × tones">
      <div style="display:grid; grid-template-columns: repeat(3, auto); gap:12px; align-items:center; justify-items:start;">
        <AtlasIconButton
          icon="mdi-close"
          :aria-label="'Close'"
          variant="tonal"
          tone="neutral"
        />
        <AtlasIconButton
          icon="mdi-close"
          :aria-label="'Close'"
          variant="tonal"
          tone="primary"
        />
        <AtlasIconButton
          icon="mdi-close"
          :aria-label="'Close'"
          variant="tonal"
          tone="danger"
        />
        <AtlasIconButton
          icon="mdi-close"
          :aria-label="'Close'"
          variant="text"
          tone="neutral"
        />
        <AtlasIconButton
          icon="mdi-close"
          :aria-label="'Close'"
          variant="text"
          tone="primary"
        />
        <AtlasIconButton
          icon="mdi-close"
          :aria-label="'Close'"
          variant="text"
          tone="danger"
        />
        <AtlasIconButton
          icon="mdi-close"
          :aria-label="'Close'"
          variant="flat"
          tone="neutral"
        />
        <AtlasIconButton
          icon="mdi-close"
          :aria-label="'Close'"
          variant="flat"
          tone="primary"
        />
        <AtlasIconButton
          icon="mdi-close"
          :aria-label="'Close'"
          variant="flat"
          tone="danger"
        />
      </div>
    </Variant>

    <Variant title="sizes">
      <div style="display:flex; gap:12px; align-items:center;">
        <AtlasIconButton
          icon="mdi-pencil"
          :aria-label="'Edit'"
          size="sm"
        />
        <AtlasIconButton
          icon="mdi-pencil"
          :aria-label="'Edit'"
          size="md"
        />
        <AtlasIconButton
          icon="mdi-pencil"
          :aria-label="'Edit'"
          size="lg"
        />
      </div>
    </Variant>

    <Variant title="states">
      <div style="display:flex; gap:12px;">
        <AtlasIconButton
          icon="mdi-content-save"
          :aria-label="'Save'"
        />
        <AtlasIconButton
          icon="mdi-content-save"
          :aria-label="'Save'"
          loading
        />
        <AtlasIconButton
          icon="mdi-content-save"
          :aria-label="'Save'"
          disabled
        />
      </div>
    </Variant>
  </Story>
</template>
