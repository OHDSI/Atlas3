<!-- src/components/ui/AtlasSelect.story.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import AtlasSelect from './AtlasSelect.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'

const ITEMS = [
  { title: 'Alpha', value: 'a' },
  { title: 'Beta',  value: 'b' },
  { title: 'Gamma', value: 'c' },
  { title: 'Delta', value: 'd' },
]

const single = ref<string | null>(null)
const multi  = ref<string[]>([])
</script>

<template>
  <Story
    title="AtlasSelect"
    group="tier-a"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasSelect"
        description="Dropdown select wrapping Vuetify's VSelect with Atlas label/required/error conventions and compact density."
        :props="[
          { name: 'modelValue', type: 'unknown', default: 'undefined', description: 'Selected value(s) (use v-model). An array when multiple.' },
          { name: 'items', type: 'unknown[]', default: '—', description: 'Options to choose from (required).' },
          { name: 'label', type: 'string', default: 'undefined', description: 'Field label; a * is appended when required.' },
          { name: 'hint', type: 'string', default: 'undefined', description: 'Helper text shown below the field.' },
          { name: 'error', type: 'string', default: 'undefined', description: 'Error message; sets aria-invalid.' },
          { name: 'required', type: 'boolean', default: 'false', description: 'Marks the field required (appends * and sets aria-required).' },
          { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the select.' },
          { name: 'itemTitle', type: 'string', default: `'title'`, description: 'Key used as the option label in items.' },
          { name: 'itemValue', type: 'string', default: `'value'`, description: 'Key used as the option value in items.' },
          { name: 'multiple', type: 'boolean', default: 'false', description: 'Allows selecting multiple values.' },
          { name: 'clearable', type: 'boolean', default: 'false', description: 'Shows a clear button to reset the selection.' },
          { name: 'placeholder', type: 'string', default: 'undefined', description: 'Placeholder shown when no value is selected.' },
          { name: '…VSelect props', type: 'see Vuetify VSelect', default: '—', description: 'Additional VSelect props are forwarded via attrs (density is fixed to compact).' },
        ]"
        :events="[
          { name: 'update:modelValue', payload: 'unknown', description: 'Emitted when the selection changes.' },
          { name: 'blur', payload: 'FocusEvent', description: 'Emitted on blur.' },
          { name: 'focus', payload: 'FocusEvent', description: 'Emitted on focus.' },
        ]"
        usage="<AtlasSelect v-model=&quot;choice&quot; :items=&quot;items&quot; label=&quot;Pick one&quot; clearable />"
        :dos="['Provide a descriptive label.', 'Use multiple only when several values make sense.']"
        :donts="[`Don't omit items — it is required.`]"
      />
    </Variant>

    <Variant title="default">
      <AtlasSelect
        v-model="single"
        :items="ITEMS"
        label="Pick one"
      />
    </Variant>

    <Variant title="multiple">
      <AtlasSelect
        v-model="multi"
        :items="ITEMS"
        multiple
        label="Pick many"
      />
    </Variant>

    <Variant title="clearable">
      <AtlasSelect
        v-model="single"
        :items="ITEMS"
        label="Pick one"
        clearable
      />
    </Variant>

    <Variant title="required">
      <AtlasSelect
        v-model="single"
        :items="ITEMS"
        label="Pick one"
        required
      />
    </Variant>

    <Variant title="with error">
      <AtlasSelect
        v-model="single"
        :items="ITEMS"
        label="Pick one"
        required
        :error="'Selection required'"
      />
    </Variant>

    <Variant title="disabled">
      <AtlasSelect
        v-model="single"
        :items="ITEMS"
        label="Frozen"
        disabled
      />
    </Variant>
  </Story>
</template>
