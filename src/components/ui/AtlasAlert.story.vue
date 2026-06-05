<script setup lang="ts">
import AtlasAlert from './AtlasAlert.vue'
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

    <Variant title="variants">
      <div style="display:grid; gap:12px;">
        <AtlasAlert
          severity="info"
          variant="tonal"
        >
          tonal (default)
        </AtlasAlert>
        <AtlasAlert
          severity="info"
          variant="outlined"
        >
          outlined
        </AtlasAlert>
        <AtlasAlert
          severity="info"
          variant="flat"
        >
          flat
        </AtlasAlert>
      </div>
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
