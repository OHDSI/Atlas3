<template>
  <v-card>
    <v-card-title>{{ t('cohortDefinitions.cohort.modals.cohortDefinition.title', 'Cohort Definition') }}</v-card-title>
    <v-card-text>
      <v-text-field
        v-model="localName"
        :label="t('columns.name', 'Name').value"
        :placeholder="t('cohortDefinitions.cohortDefinitionManager.namePlaceholder', 'Enter cohort name').value"
        variant="outlined"
        density="comfortable"
        :rules="[rules.required]"
        @update:model-value="emit('update:name', $event)"
      />

      <v-textarea
        v-model="localDescription"
        :label="t('columns.description', 'Description').value"
        :placeholder="t('cohortDefinitions.cohortDefinitionManager.descriptionPlaceholder', 'Enter cohort description (optional)').value"
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
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

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
  required: (value: string) => !!value || t('commonErrors.required', 'This field is required').value,
}
</script>
