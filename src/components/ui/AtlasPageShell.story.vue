<script setup lang="ts">
import AtlasPageShell from './AtlasPageShell.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasPageShell"
    group="top"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasPageShell"
        description="Page layout wrapper that renders content inside a full-width AtlasCard with an optional header (title, subtitle, eyebrow, actions). The header only renders when a title or one of the header slots is provided."
        :props="[
          { name: 'title', type: 'string', default: 'undefined', description: 'Static header title. Overridden by the title slot when present.' },
          { name: 'subtitle', type: 'string', default: 'undefined', description: 'Static header subtitle. Overridden by the subtitle slot when present.' },
          { name: 'hero', type: 'boolean', default: 'false', description: 'Renders the header in hero style (eyebrow + accent rule + larger light-weight title).' },
          { name: 'compact', type: 'boolean', default: 'false', description: 'Tightens the hero header (smaller title and spacing). Ignored unless hero is true.' },
          { name: 'eyebrow', type: 'string', default: 'undefined', description: 'Eyebrow text shown above the title in hero mode. Ignored when hero is false.' },
        ]"
        :slots="[
          { name: 'default', description: 'Page body content rendered inside the card.' },
          { name: 'title', description: 'Custom header title content (e.g. an inline-edit input); wins over the title prop.' },
          { name: 'subtitle', description: 'Custom header subtitle content; wins over the subtitle prop.' },
          { name: 'actions', description: 'Header actions rendered on the right side of the header row.' },
        ]"
        usage="<AtlasPageShell title=&quot;Concepts&quot; subtitle=&quot;Browse concept sets.&quot;>…body…</AtlasPageShell>"
        :dos="['Use one PageShell per route to give pages a consistent card + header.', 'Use hero for primary entry surfaces; compact hero for everyday workspace pages.']"
        :donts="[`Don't nest PageShells.`, `Don't rely on eyebrow/compact without hero — they are ignored.`]"
      />
    </Variant>

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
