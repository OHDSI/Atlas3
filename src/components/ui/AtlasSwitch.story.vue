<script setup lang="ts">
import { ref } from 'vue'
import AtlasSwitch from './AtlasSwitch.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'

const active = ref(true)
</script>

<template>
  <Story
    title="AtlasSwitch"
    group="tier-a"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasSwitch"
        description="Boolean toggle wrapping Vuetify's VSwitch with a semantic tone, optional error, and compact density."
        :props="[
          { name: 'modelValue', type: 'boolean', default: 'false', description: 'On/off state (use v-model).' },
          { name: 'label', type: 'string', default: 'undefined', description: 'Switch label text.' },
          { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the switch.' },
          { name: 'tone', type: `'primary'|'success'|'danger'`, default: `'primary'`, description: 'Color tone when the switch is on.' },
          { name: 'error', type: 'string', default: 'undefined', description: 'Error message; sets aria-invalid.' },
          { name: 'required', type: 'boolean', default: 'false', description: 'Sets aria-required for assistive tech.' },
          { name: '…VSwitch props', type: 'see Vuetify VSwitch', default: '—', description: 'Additional VSwitch props are forwarded via attrs (density and color are managed internally).' },
        ]"
        :events="[{ name: 'update:modelValue', payload: 'boolean', description: 'Emitted when the toggle changes (coerced to a boolean).' }]"
        usage="<AtlasSwitch v-model=&quot;enabled&quot; label=&quot;Enable notifications&quot; />"
        :dos="['Use a label that reads true when on.', 'Use tone to reinforce meaning (e.g. danger for destructive toggles).']"
        :donts="[`Don't use a switch for actions that need confirmation — use a button.`]"
      />
    </Variant>

    <Variant title="tones">
      <div style="display:flex; gap:24px;">
        <AtlasSwitch
          :model-value="true"
          tone="primary"
          label="Primary"
        />
        <AtlasSwitch
          :model-value="true"
          tone="success"
          label="Success"
        />
        <AtlasSwitch
          :model-value="true"
          tone="danger"
          label="Danger"
        />
      </div>
    </Variant>

    <Variant title="disabled">
      <AtlasSwitch
        :model-value="true"
        label="Disabled on"
        disabled
      />
      <AtlasSwitch
        :model-value="false"
        label="Disabled off"
        disabled
      />
    </Variant>

    <Variant title="with label">
      <AtlasSwitch
        v-model="active"
        label="Enable notifications"
      />
    </Variant>
  </Story>
</template>
