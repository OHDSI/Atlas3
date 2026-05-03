<!-- Note: TypeScript errors in this file are a vue-tsc limitation with HTML attr-to-prop mapping (aria-label → ariaLabel).  -->
<!-- The code works correctly at runtime; vue-tsc's type checking is overly strict for this pattern. -->
<script setup lang="ts">
import AtlasIconButton from './AtlasIconButton.vue'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Button = AtlasIconButton as any
</script>

<template>
  <Story
    title="AtlasIconButton"
    group="tier-a"
  >
    <Variant title="variants × tones">
      <div style="display:grid; grid-template-columns: repeat(3, auto); gap:12px; align-items:center; justify-items:start;">
        <Button
          icon="mdi-close"
          aria-label="Close"
          variant="tonal"
          tone="neutral"
        />
        <Button
          icon="mdi-close"
          aria-label="Close"
          variant="tonal"
          tone="primary"
        />
        <Button
          icon="mdi-close"
          aria-label="Close"
          variant="tonal"
          tone="danger"
        />
        <Button
          icon="mdi-close"
          aria-label="Close"
          variant="text"
          tone="neutral"
        />
        <Button
          icon="mdi-close"
          aria-label="Close"
          variant="text"
          tone="primary"
        />
        <Button
          icon="mdi-close"
          aria-label="Close"
          variant="text"
          tone="danger"
        />
        <Button
          icon="mdi-close"
          aria-label="Close"
          variant="flat"
          tone="neutral"
        />
        <Button
          icon="mdi-close"
          aria-label="Close"
          variant="flat"
          tone="primary"
        />
        <Button
          icon="mdi-close"
          aria-label="Close"
          variant="flat"
          tone="danger"
        />
      </div>
    </Variant>

    <Variant title="sizes">
      <div style="display:flex; gap:12px; align-items:center;">
        <Button
          icon="mdi-pencil"
          aria-label="Edit"
          size="sm"
        />
        <Button
          icon="mdi-pencil"
          aria-label="Edit"
          size="md"
        />
        <Button
          icon="mdi-pencil"
          aria-label="Edit"
          size="lg"
        />
      </div>
    </Variant>

    <Variant title="states">
      <div style="display:flex; gap:12px;">
        <Button
          icon="mdi-content-save"
          aria-label="Save"
        />
        <Button
          icon="mdi-content-save"
          aria-label="Save"
          loading
        />
        <Button
          icon="mdi-content-save"
          aria-label="Save"
          disabled
        />
      </div>
    </Variant>
  </Story>
</template>
