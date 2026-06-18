<script setup lang="ts">
import AtlasAlert from './AtlasAlert.vue'
import AtlasButton from './AtlasButton.vue'
</script>

<template>
  <Story
    title="AtlasAlert"
    group="components"
  >
    <Variant title="severities">
      <div style="display:grid; gap:12px;">
        <AtlasAlert
          severity="info"
          title="FYI"
        >
          A neutral informational message.
        </AtlasAlert>
        <AtlasAlert
          severity="success"
          title="Saved"
        >
          Cohort definition saved successfully.
        </AtlasAlert>
        <AtlasAlert
          severity="warning"
          title="Heads up"
        >
          No data sources are currently selected.
        </AtlasAlert>
        <AtlasAlert
          severity="danger"
          title="Error"
        >
          Failed to generate cohort.
        </AtlasAlert>
      </div>
    </Variant>

    <Variant title="neutral note">
      <AtlasAlert
        tone="neutral"
        title="Note"
      >
        Inclusion rules are applied in order. Drag to reorder.
      </AtlasAlert>
    </Variant>

    <Variant title="count + details + actions">
      <AtlasAlert
        severity="warning"
        title="Configuration validation warnings"
        :count="3"
        closable
      >
        Some filter types are misconfigured and won't appear in the UI.
        <template #details>Invalid: foo, bar, baz</template>
        <template #actions>
          <AtlasButton size="sm" variant="tonal">View details</AtlasButton>
        </template>
      </AtlasAlert>
    </Variant>

    <Variant title="closable">
      <AtlasAlert
        severity="info"
        title="Dismissable"
        closable
      >
        Click X to dismiss.
      </AtlasAlert>
    </Variant>

    <Variant title="custom icon">
      <AtlasAlert
        severity="info"
        prepend-icon="mdi-bell"
        title="Bell"
      >
        Custom icon override.
      </AtlasAlert>
    </Variant>
  </Story>
</template>
