<script setup lang="ts">
import { ref } from 'vue'
import AtlasRadioGroup from './AtlasRadioGroup.vue'
import AtlasRadio from './AtlasRadio.vue'

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
