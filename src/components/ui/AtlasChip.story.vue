<script setup lang="ts">
import AtlasChip from './AtlasChip.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasChip"
    group="tier-a"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasChip"
        description="Compact label/tag wrapping Vuetify's VChip with brand tones, sizes, an optional prepend icon and a closable affordance."
        :props="[
          { name: 'tone', type: `'neutral'|'primary'|'info'|'success'|'warning'|'danger'`, default: 'undefined', description: 'Semantic color; falls back to a passed color attr.' },
          { name: 'size', type: `'xs'|'sm'|'md'`, default: 'md', description: 'Chip size.' },
          { name: 'closable', type: 'boolean', default: 'false', description: 'Shows a close button that emits close.' },
          { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the chip.' },
          { name: 'prependIcon', type: 'string', default: 'undefined', description: 'MDI icon shown before the label.' },
        ]"
        :events="[
          { name: 'click', payload: 'MouseEvent | KeyboardEvent', description: 'Emitted when the chip is activated.' },
          { name: 'close', payload: 'MouseEvent | KeyboardEvent', description: 'Emitted when the close button is activated.' },
        ]"
        :slots="[{ name: 'default', description: 'Chip label content.' }]"
        usage="<AtlasChip tone=&quot;success&quot; prepend-icon=&quot;mdi-check&quot;>passed</AtlasChip>"
      />
    </Variant>

    <Variant title="tones">
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <AtlasChip>neutral</AtlasChip>
        <AtlasChip tone="primary">
          primary
        </AtlasChip>
        <AtlasChip tone="info">
          info
        </AtlasChip>
        <AtlasChip tone="success">
          success
        </AtlasChip>
        <AtlasChip tone="warning">
          warning
        </AtlasChip>
        <AtlasChip tone="danger">
          danger
        </AtlasChip>
      </div>
    </Variant>

    <Variant title="sizes">
      <div style="display:flex; gap:8px; align-items:center;">
        <AtlasChip size="sm">
          small
        </AtlasChip>
        <AtlasChip size="md">
          medium
        </AtlasChip>
      </div>
    </Variant>

    <Variant title="with prepend icon">
      <div style="display:flex; gap:8px;">
        <AtlasChip
          tone="success"
          prepend-icon="mdi-check"
        >
          passed
        </AtlasChip>
        <AtlasChip
          tone="warning"
          prepend-icon="mdi-alert"
        >
          warning
        </AtlasChip>
        <AtlasChip
          tone="danger"
          prepend-icon="mdi-close"
        >
          failed
        </AtlasChip>
      </div>
    </Variant>

    <Variant title="closable">
      <AtlasChip
        closable
        tone="primary"
      >
        filter: cohort A
      </AtlasChip>
    </Variant>

    <Variant title="disabled">
      <AtlasChip
        tone="primary"
        disabled
      >
        frozen
      </AtlasChip>
    </Variant>
  </Story>
</template>
