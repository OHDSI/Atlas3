<!-- src/components/ui/AtlasTextField.story.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import AtlasTextField from './AtlasTextField.vue'

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
