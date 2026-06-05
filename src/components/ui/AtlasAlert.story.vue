<script setup lang="ts">
import AtlasAlert from './AtlasAlert.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'
</script>

<template>
  <Story
    title="AtlasAlert"
    group="tier-a"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasAlert"
        description="Inline notification banner wrapping Vuetify's VAlert with brand severities, a default per-severity icon and optional dismiss."
        :props="[
          { name: 'severity', type: `'info'|'success'|'warning'|'danger'`, default: 'info', description: 'Semantic tone; maps to the VAlert type and default icon.' },
          { name: 'title', type: 'string', default: 'undefined', description: 'Bold heading shown above the body.' },
          { name: 'closable', type: 'boolean', default: 'false', description: 'Shows a close button that emits close.' },
          { name: 'variant', type: `'tonal'|'outlined'|'flat'`, default: 'tonal', description: 'Visual style.' },
          { name: 'prependIcon', type: 'string', default: 'undefined', description: 'MDI icon overriding the severity default.' },
        ]"
        :events="[{ name: 'close', payload: '—', description: 'Emitted when the close button is clicked.' }]"
        :slots="[
          { name: 'default', description: 'Alert body content.' },
          { name: 'prepend', description: 'Custom leading content (replaces the icon area).' },
          { name: 'append', description: 'Custom trailing content.' },
        ]"
        usage="<AtlasAlert severity=&quot;success&quot; title=&quot;Saved&quot;>Cohort saved.</AtlasAlert>"
      />
    </Variant>

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
