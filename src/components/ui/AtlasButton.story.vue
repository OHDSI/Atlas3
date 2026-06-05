<script setup lang="ts">
import AtlasButton from './AtlasButton.vue'
</script>

<template>
  <Story
    title="AtlasButton"
    group="tier-a"
  >

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
