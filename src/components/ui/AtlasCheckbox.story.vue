<script setup lang="ts">
import { ref } from 'vue'
import AtlasCheckbox from './AtlasCheckbox.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'

const checked = ref(false)
</script>

<template>
  <Story
    title="AtlasCheckbox"
    group="tier-a"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasCheckbox"
        description="Boolean checkbox wrapping Vuetify's VCheckbox with brand label/required/error conventions and an indeterminate state."
        :props="[
          { name: 'modelValue', type: 'boolean', default: 'false', description: 'Checked state. Use v-model.' },
          { name: 'label', type: 'string', default: 'undefined', description: 'Checkbox label.' },
          { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the checkbox.' },
          { name: 'error', type: 'string', default: 'undefined', description: 'Error message; sets aria-invalid.' },
          { name: 'indeterminate', type: 'boolean', default: 'false', description: 'Shows the mixed/indeterminate state.' },
          { name: 'required', type: 'boolean', default: 'false', description: 'Sets aria-required.' },
        ]"
        :events="[{ name: 'update:modelValue', payload: 'boolean', description: 'Emitted when toggled (coerced to boolean).' }]"
        usage="<AtlasCheckbox v-model=&quot;agreed&quot; label=&quot;I agree&quot; />"
      />
    </Variant>

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
