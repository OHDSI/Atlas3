<script setup lang="ts">
import { ref } from 'vue'
import AtlasSnackbar from './AtlasSnackbar.vue'
import AtlasButton from './AtlasButton.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'

const open = ref(false)
const openSuccess = ref(false)
const openWarning = ref(false)
const openDanger = ref(false)
const openTop = ref(false)
</script>

<template>
  <Story
    title="AtlasSnackbar"
    group="tier-a"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasSnackbar"
        description="Transient notification wrapping Vuetify's VSnackbar. Maps a semantic severity to a color and ARIA role, with an optional built-in close button."
        :props="[
          { name: 'modelValue', type: 'boolean', default: '—', description: 'Open state (use v-model) (required).' },
          { name: 'severity', type: `'info'|'success'|'warning'|'danger'`, default: `'info'`, description: 'Semantic tone; sets color and aria-live (danger is assertive).' },
          { name: 'text', type: 'string', default: 'undefined', description: 'Message text (used when the default slot is empty).' },
          { name: 'timeout', type: 'number', default: '5000', description: 'Auto-dismiss delay in ms; use -1 to disable.' },
          { name: 'location', type: `'top'|'bottom'`, default: `'bottom'`, description: 'Where the snackbar appears.' },
          { name: 'closable', type: 'boolean', default: 'true', description: 'Shows a built-in Close button (unless the actions slot is used).' },
          { name: '…VSnackbar props', type: 'see Vuetify VSnackbar', default: '—', description: 'Additional VSnackbar props are forwarded via attrs (color is derived from severity).' },
        ]"
        :events="[{ name: 'update:modelValue', payload: 'boolean', description: 'Emitted when the open state changes (e.g. on timeout or close).' }]"
        :slots="[
          { name: 'default', description: 'Message content; overrides the text prop.' },
          { name: 'actions', description: 'Custom action buttons; replaces the built-in Close button.' },
        ]"
        usage="<AtlasSnackbar v-model=&quot;open&quot; severity=&quot;success&quot; text=&quot;Saved.&quot; />"
        :dos="['Use severity to convey meaning rather than custom colors.', 'Keep messages short.']"
        :donts="[`Don't use a long timeout for non-critical messages.`]"
      />
    </Variant>

    <Variant title="info">
      <AtlasButton @click="open = true">
        Show info snackbar
      </AtlasButton>
      <AtlasSnackbar
        v-model="open"
        text="An informational message."
      />
    </Variant>
    <Variant title="success">
      <AtlasButton
        variant="secondary"
        @click="openSuccess = true"
      >
        Show success
      </AtlasButton>
      <AtlasSnackbar
        v-model="openSuccess"
        severity="success"
        text="Cohort saved."
      />
    </Variant>
    <Variant title="warning">
      <AtlasButton
        variant="secondary"
        @click="openWarning = true"
      >
        Show warning
      </AtlasButton>
      <AtlasSnackbar
        v-model="openWarning"
        severity="warning"
        text="No data sources selected."
      />
    </Variant>
    <Variant title="danger">
      <AtlasButton
        variant="danger"
        @click="openDanger = true"
      >
        Show danger
      </AtlasButton>
      <AtlasSnackbar
        v-model="openDanger"
        severity="danger"
        text="Failed to generate cohort."
        :timeout="-1"
      />
    </Variant>
    <Variant title="top location">
      <AtlasButton @click="openTop = true">
        Show at top
      </AtlasButton>
      <AtlasSnackbar
        v-model="openTop"
        location="top"
        text="Top of viewport."
      />
    </Variant>
  </Story>
</template>
