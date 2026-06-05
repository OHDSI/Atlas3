<script setup lang="ts">
import { ref } from 'vue'
import AtlasRadio from './AtlasRadio.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'

const selected = ref('a')
</script>

<template>
  <Story
    title="AtlasRadio"
    group="tier-a"
  >
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasRadio"
        description="Single radio option wrapping Vuetify's VRadio. Use inside an AtlasRadioGroup (or VRadioGroup) which owns the selected value."
        :props="[
          { name: 'value', type: 'string | number', default: '—', description: 'The value this option represents (required).' },
          { name: 'label', type: 'string', default: 'undefined', description: 'Option label text.' },
          { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables this option.' },
          { name: '…VRadio props', type: 'see Vuetify VRadio', default: '—', description: 'Additional VRadio props are forwarded via attrs.' },
        ]"
        usage="<AtlasRadioGroup v-model=&quot;choice&quot;><AtlasRadio value=&quot;a&quot; label=&quot;Option A&quot; /></AtlasRadioGroup>"
        :dos="['Always render inside a radio group that owns the model value.', 'Give every option a clear label.']"
        :donts="[`Don't bind v-model on individual radios — the group owns selection.`]"
      />
    </Variant>

    <Variant title="inside v-radio-group">
      <v-radio-group v-model="selected">
        <AtlasRadio
          value="a"
          label="Option A"
        />
        <AtlasRadio
          value="b"
          label="Option B"
        />
        <AtlasRadio
          value="c"
          label="Option C (disabled)"
          disabled
        />
      </v-radio-group>
    </Variant>
  </Story>
</template>
