<script setup lang="ts">
import { ref } from 'vue'
import AtlasCheckbox from './AtlasCheckbox.vue'

const checked = ref(false)
</script>

<template>
  <Story
    title="AtlasCheckbox"
    group="components"
  >
    <Variant title="default">
      <AtlasCheckbox
        v-model="checked"
        label="I agree to the terms"
      />
    </Variant>

    <Variant title="checked">
      <AtlasCheckbox
        :model-value="true"
        label="Already checked"
      />
    </Variant>

    <Variant title="disabled">
      <AtlasCheckbox
        :model-value="false"
        label="Disabled unchecked"
        disabled
      />
      <AtlasCheckbox
        :model-value="true"
        label="Disabled checked"
        disabled
      />
    </Variant>

    <Variant title="indeterminate">
      <AtlasCheckbox
        label="Indeterminate state"
        indeterminate
      />
    </Variant>

    <Variant title="with error">
      <AtlasCheckbox
        label="Accept terms"
        error="You must accept the terms"
      />
    </Variant>
  </Story>
</template>
