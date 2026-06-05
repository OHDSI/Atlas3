<script setup lang="ts">
import AtlasChip from './AtlasChip.vue'
</script>

<template>
  <Story
    title="AtlasChip"
    group="components"
  >
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
