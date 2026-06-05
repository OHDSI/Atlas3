<script setup lang="ts">
import { ref } from 'vue'
import AtlasRadioGroup from './AtlasRadioGroup.vue'
import AtlasRadio from './AtlasRadio.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'

const vertical = ref('b')
const inline = ref('x')
const withError = ref('')
const required = ref('yes')
</script>

<template>
  <Story
    title="AtlasRadioGroup"
    group="tier-a"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasRadioGroup"
        description="Container for AtlasRadio options wrapping Vuetify's VRadioGroup. Owns the selected value via v-model and handles label, required marker, error and layout."
        :props="[
          { name: 'modelValue', type: 'string | number', default: 'undefined', description: 'Selected value (use v-model).' },
          { name: 'label', type: 'string', default: 'undefined', description: 'Group label; a * is appended when required.' },
          { name: 'inline', type: 'boolean', default: 'false', description: 'Lays radios out horizontally instead of stacked.' },
          { name: 'error', type: 'string', default: 'undefined', description: 'Error message shown below the group; sets aria-invalid.' },
          { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables all options.' },
          { name: 'required', type: 'boolean', default: 'false', description: 'Marks the group required (appends * and sets aria-required).' },
          { name: '…VRadioGroup props', type: 'see Vuetify VRadioGroup', default: '—', description: 'Additional VRadioGroup props are forwarded via attrs (density is fixed to compact).' },
        ]"
        :events="[{ name: 'update:modelValue', payload: 'string | number | null', description: 'Emitted when the selection changes.' }]"
        :slots="[{ name: 'default', description: 'AtlasRadio options.' }]"
        usage="<AtlasRadioGroup v-model=&quot;choice&quot; label=&quot;Method&quot; required><AtlasRadio value=&quot;a&quot; label=&quot;Email&quot; /></AtlasRadioGroup>"
        :dos="['Provide a clear group label.', 'Use inline only for short option sets.']"
        :donts="[`Don't put v-model on the child radios.`]"
      />
    </Variant>

    <Variant title="vertical (default)">
      <AtlasRadioGroup
        v-model="vertical"
        label="Preferred method"
      >
        <AtlasRadio
          value="a"
          label="Email"
        />
        <AtlasRadio
          value="b"
          label="Phone"
        />
        <AtlasRadio
          value="c"
          label="Post"
        />
      </AtlasRadioGroup>
    </Variant>

    <Variant title="inline">
      <AtlasRadioGroup
        v-model="inline"
        label="Size"
        inline
      >
        <AtlasRadio
          value="x"
          label="Small"
        />
        <AtlasRadio
          value="y"
          label="Medium"
        />
        <AtlasRadio
          value="z"
          label="Large"
        />
      </AtlasRadioGroup>
    </Variant>

    <Variant title="with error">
      <AtlasRadioGroup
        v-model="withError"
        label="Category"
        error="Please select a category"
      >
        <AtlasRadio
          value="1"
          label="Category 1"
        />
        <AtlasRadio
          value="2"
          label="Category 2"
        />
      </AtlasRadioGroup>
    </Variant>

    <Variant title="with required label">
      <AtlasRadioGroup
        v-model="required"
        label="Consent"
        required
      >
        <AtlasRadio
          value="yes"
          label="Yes"
        />
        <AtlasRadio
          value="no"
          label="No"
        />
      </AtlasRadioGroup>
    </Variant>
  </Story>
</template>
