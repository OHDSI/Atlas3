<script setup lang="ts">
import { ref } from 'vue'
import AtlasSwitch from './AtlasSwitch.vue'

const active = ref(true)
</script>

<template>
  <Story
    title="AtlasSwitch"
    group="components"
  >
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
