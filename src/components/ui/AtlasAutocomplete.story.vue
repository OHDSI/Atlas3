<!-- src/components/ui/AtlasAutocomplete.story.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import AtlasAutocomplete from './AtlasAutocomplete.vue'
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
    title="AtlasAutocomplete"
    group="tier-a"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasAutocomplete"
        description="Filterable select wrapping Vuetify's VAutocomplete with brand label/required/error conventions, single or multiple selection."
        :props="[
          { name: 'modelValue', type: 'unknown', default: 'undefined', description: 'Selected value (or array when multiple). Use v-model.' },
          { name: 'items', type: 'unknown[]', default: '(required)', description: 'Option list.' },
          { name: 'label', type: 'string', default: 'undefined', description: 'Field label; gets a * appended when required.' },
          { name: 'hint', type: 'string', default: 'undefined', description: 'Helper text below the field.' },
          { name: 'error', type: 'string', default: 'undefined', description: 'Error message; sets aria-invalid.' },
          { name: 'required', type: 'boolean', default: 'false', description: 'Marks the field required (label * and aria-required).' },
          { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the field.' },
          { name: 'itemTitle', type: 'string', default: `'title'`, description: 'Item key used for display text.' },
          { name: 'itemValue', type: 'string', default: `'value'`, description: 'Item key used for the selected value.' },
          { name: 'multiple', type: 'boolean', default: 'false', description: 'Allows selecting multiple items.' },
          { name: 'clearable', type: 'boolean', default: 'false', description: 'Shows a clear button.' },
          { name: 'placeholder', type: 'string', default: 'undefined', description: 'Placeholder text.' },
          { name: 'noFilter', type: 'boolean', default: 'false', description: 'Disables client-side filtering (for async search).' },
        ]"
        :events="[
          { name: 'update:modelValue', payload: 'unknown', description: 'Emitted when the selection changes.' },
          { name: 'update:search', payload: 'string', description: 'Emitted as the search text changes.' },
          { name: 'blur', payload: 'FocusEvent', description: 'Emitted on blur.' },
          { name: 'focus', payload: 'FocusEvent', description: 'Emitted on focus.' },
        ]"
        usage="<AtlasAutocomplete v-model=&quot;value&quot; :items=&quot;items&quot; label=&quot;Pick one&quot; clearable />"
      />
    </Variant>

    <Variant title="default">
      <AtlasAutocomplete
        v-model="single"
        :items="ITEMS"
        label="Pick one"
      />
    </Variant>

    <Variant title="multiple">
      <AtlasAutocomplete
        v-model="multi"
        :items="ITEMS"
        multiple
        label="Pick many"
      />
    </Variant>

    <Variant title="clearable">
      <AtlasAutocomplete
        v-model="single"
        :items="ITEMS"
        label="Pick one"
        clearable
      />
    </Variant>

    <Variant title="required">
      <AtlasAutocomplete
        v-model="single"
        :items="ITEMS"
        label="Pick one"
        required
      />
    </Variant>

    <Variant title="with error">
      <AtlasAutocomplete
        v-model="single"
        :items="ITEMS"
        label="Pick one"
        required
        :error="'Selection required'"
      />
    </Variant>

    <Variant title="disabled">
      <AtlasAutocomplete
        v-model="single"
        :items="ITEMS"
        label="Frozen"
        disabled
      />
    </Variant>

    <Variant title="no-filter (async-style)">
      <AtlasAutocomplete
        v-model="single"
        :items="ITEMS"
        label="Pick one"
        no-filter
      />
    </Variant>
  </Story>
</template>
