<script setup lang="ts">
import AtlasIconButton from './AtlasIconButton.vue'
</script>

<template>
  <Story
    title="AtlasIconButton"
    group="components"
  >
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
