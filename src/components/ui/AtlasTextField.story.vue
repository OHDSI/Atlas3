<!-- src/components/ui/AtlasTextField.story.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import AtlasTextField from './AtlasTextField.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'

const value = ref('')
const numberValue = ref<number | undefined>(undefined)
const passwordValue = ref('')
const multilineValue = ref('')
</script>

<template>
  <Story
    title="AtlasTextField"
    group="tier-a"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasTextField"
        description="Text input wrapping Vuetify's VTextField (or VTextarea when multiline) with Atlas label/required/error conventions, icons, and compact density."
        :props="[
          { name: 'modelValue', type: 'string | number', default: 'undefined', description: 'Field value (use v-model).' },
          { name: 'label', type: 'string', default: 'undefined', description: 'Field label; a * is appended when required.' },
          { name: 'hint', type: 'string', default: 'undefined', description: 'Helper text shown below the field.' },
          { name: 'error', type: 'string', default: 'undefined', description: 'Error message; sets aria-invalid.' },
          { name: 'required', type: 'boolean', default: 'false', description: 'Marks the field required (appends * and sets aria-required).' },
          { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the field.' },
          { name: 'readonly', type: 'boolean', default: 'false', description: 'Makes the field read-only.' },
          { name: 'type', type: `'text'|'email'|'password'|'number'|'search'|'url'|'date'|'time'|'datetime-local'|'color'`, default: `'text'`, description: 'Native input type (ignored when multiline).' },
          { name: 'placeholder', type: 'string', default: 'undefined', description: 'Placeholder text.' },
          { name: 'prependIcon', type: 'string', default: 'undefined', description: 'MDI icon rendered inside the field at the start.' },
          { name: 'appendIcon', type: 'string', default: 'undefined', description: 'MDI icon rendered inside the field at the end.' },
          { name: 'multiline', type: 'boolean', default: 'false', description: 'Renders a VTextarea instead of a single-line input.' },
          { name: 'rows', type: 'number', default: '3', description: 'Number of rows when multiline.' },
          { name: '…VTextField props', type: 'see Vuetify VTextField / VTextarea', default: '—', description: 'Additional props are forwarded via attrs (density is fixed to compact).' },
        ]"
        :events="[
          { name: 'update:modelValue', payload: 'string | number', description: 'Emitted when the value changes.' },
          { name: 'blur', payload: 'FocusEvent', description: 'Emitted on blur.' },
          { name: 'focus', payload: 'FocusEvent', description: 'Emitted on focus.' },
        ]"
        :slots="[{ name: '…VTextField slots', description: 'All slots are forwarded to the underlying VTextField / VTextarea.' }]"
        usage="<AtlasTextField v-model=&quot;name&quot; label=&quot;Name&quot; placeholder=&quot;Enter your name&quot; />"
        :dos="['Always provide a label for accessibility.', 'Use the error prop to surface validation messages.']"
        :donts="[`Don't use multiline for single-line values like names.`]"
      />
    </Variant>

    <Variant title="default">
      <AtlasTextField
        v-model="value"
        label="Name"
        placeholder="Enter your name"
      />
    </Variant>

    <Variant title="with hint">
      <AtlasTextField
        v-model="value"
        label="Email"
        hint="We won't share it."
        type="email"
      />
    </Variant>

    <Variant title="required">
      <AtlasTextField
        v-model="value"
        label="Cohort name"
        required
      />
    </Variant>

    <Variant title="with error">
      <AtlasTextField
        v-model="value"
        label="Cohort name"
        required
        :error="'Cohort name is required'"
      />
    </Variant>

    <Variant title="disabled / readonly">
      <div style="display:grid; gap:16px;">
        <AtlasTextField
          label="Disabled"
          :model-value="'cannot edit'"
          disabled
        />
        <AtlasTextField
          label="Readonly"
          :model-value="'view only'"
          readonly
        />
      </div>
    </Variant>

    <Variant title="number type">
      <AtlasTextField
        v-model="numberValue"
        label="Age"
        type="number"
      />
    </Variant>

    <Variant title="password type">
      <AtlasTextField
        v-model="passwordValue"
        label="Password"
        type="password"
      />
    </Variant>

    <Variant title="with prepend / append icons">
      <AtlasTextField
        v-model="value"
        label="Search"
        prepend-icon="mdi-magnify"
        append-icon="mdi-close"
      />
    </Variant>

    <Variant title="multiline">
      <AtlasTextField
        v-model="multilineValue"
        label="Description"
        multiline
        :rows="4"
      />
    </Variant>
  </Story>
</template>
