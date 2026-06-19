<script setup lang="ts">
import AtlasCollapsibleSection from './AtlasCollapsibleSection.vue'
import AtlasButton from './AtlasButton.vue'
import AtlasSwitch from './AtlasSwitch.vue'
</script>

<template>
  <Story
    title="AtlasCollapsibleSection"
    group="components"
  >
    <Variant title="default (expanded)">
      <AtlasCollapsibleSection title="Generation">
        <p style="margin:0;">
          Section body content lives here and stays mounted while collapsed.
        </p>
      </AtlasCollapsibleSection>
    </Variant>

    <Variant title="collapsed by default">
      <AtlasCollapsibleSection
        title="Advanced settings"
        :default-expanded="false"
      >
        <p style="margin:0;">
          Hidden until the header is toggled.
        </p>
      </AtlasCollapsibleSection>
    </Variant>

    <Variant title="badge, state chip & meta">
      <AtlasCollapsibleSection
        title="Generation"
        badge="1"
        :state-chip="{ label: 'Ready', tone: 'success' }"
        meta="Last run · 2h ago"
      >
        <p style="margin:0;">
          The header summarises status without expanding the section.
        </p>
      </AtlasCollapsibleSection>
    </Variant>

    <Variant title="controls & actions slots">
      <AtlasCollapsibleSection title="Generation">
        <template #controls>
          <AtlasSwitch label="Auto-run" />
        </template>
        <template #actions>
          <AtlasButton
            size="sm"
            variant="secondary"
          >
            Run
          </AtlasButton>
        </template>
        <p style="margin:0;">
          Interacting with the controls/actions slots does not toggle the section.
        </p>
      </AtlasCollapsibleSection>
    </Variant>
  </Story>
</template>
