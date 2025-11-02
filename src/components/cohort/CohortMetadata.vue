<template>
  <v-card>
    <v-card-title>Cohort Definition</v-card-title>
    <v-card-text>
      <v-text-field
        v-model="localName"
        label="Name"
        placeholder="Enter cohort name"
        variant="outlined"
        density="comfortable"
        :rules="[rules.required]"
        @update:model-value="emit('update:name', $event)"
      />

      <v-textarea
        v-model="localDescription"
        label="Description"
        placeholder="Enter cohort description (optional)"
        variant="outlined"
        density="comfortable"
        rows="3"
        @update:model-value="emit('update:description', $event)"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  name: string
  description?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:name': [value: string]
  'update:description': [value: string]
}>()

const localName = ref(props.name)
const localDescription = ref(props.description ?? '')

// Sync with props changes
watch(() => props.name, (newVal) => {
  localName.value = newVal
})

watch(() => props.description, (newVal) => {
  localDescription.value = newVal ?? ''
})

const rules = {
  required: (value: string) => !!value || 'This field is required',
}
</script>
