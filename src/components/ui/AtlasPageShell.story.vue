<script setup lang="ts">
import AtlasPageShell from './AtlasPageShell.vue'
</script>

<template>
  <Story
    title="AtlasPageShell"
    group="components"
  >
    <Variant title="default header">
      <AtlasPageShell
        title="My page"
        subtitle="A short subtitle for context."
      >
        <p>Page body content goes here.</p>
      </AtlasPageShell>
    </Variant>

    <Variant title="hero header with eyebrow">
      <AtlasPageShell
        hero
        eyebrow="OHDSI · CDM"
        title="Concepts"
        subtitle="Browse and curate concept sets."
      >
        <p>Page body content.</p>
      </AtlasPageShell>
    </Variant>

    <Variant title="hero-compact">
      <AtlasPageShell
        hero
        compact
        eyebrow="ANALYSIS"
        title="Cohort builder"
        subtitle="Define a cohort."
      >
        <p>Compact hero — same rhythm, smaller.</p>
      </AtlasPageShell>
    </Variant>

    <Variant title="with actions slot">
      <AtlasPageShell
        title="My page"
        subtitle="Header with buttons on the right."
      >
        <template #actions>
          <button>Save</button>
          <button>Cancel</button>
        </template>
        <p>Body.</p>
      </AtlasPageShell>
    </Variant>
  </Story>
</template>
