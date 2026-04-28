<template>
  <v-card>
    <v-card-title>
      {{ modelValue?.id ? t('components.conceptSet.actionEdit') : t('components.conceptSet.actionCreate') }}
    </v-card-title>
    <v-card-text>
      <!-- Concept Set Name -->
      <v-text-field
        :model-value="modelValue?.name || ''"
        :label="tv('components.conceptSet.name')"
        :placeholder="tv('conceptSetEditor.namePlaceholder')"
        data-testid="concept-set-name"
        @update:model-value="updateName"
      />

      <!-- Concept List -->
      <v-card
        variant="outlined"
        class="mt-4"
      >
        <v-card-title class="text-subtitle-1">
          {{ t('conceptSetEditor.conceptsCount', { count: conceptCount }) }}
        </v-card-title>
        <v-card-text>
          <v-list
            v-if="concepts.length > 0"
            data-testid="concept-list"
          >
            <v-list-item
              v-for="(item, index) in concepts"
              :key="item.conceptId"
            >
              <v-list-item-title>
                {{ item.conceptName }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ t('conceptSetEditor.conceptDetails', { 
                  id: item.conceptId, 
                  domain: item.domainId, 
                  vocabulary: item.vocabularyId 
                }) }}
              </v-list-item-subtitle>

              <template #append>
                <!-- Include Descendants Checkbox -->
                <v-checkbox
                  :model-value="item.includeDescendants"
                  :label="tv('columns.descendants')"
                  hide-details
                  density="compact"
                  :data-testid="`include-descendants-${index}`"
                  @update:model-value="(val) => updateIncludeDescendants(index, val ?? false)"
                />

                <!-- Remove Button -->
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  :data-testid="`remove-concept-${index}`"
                  @click="removeConcept(index)"
                />
              </template>
            </v-list-item>
          </v-list>

          <v-alert
            v-else
            type="info"
            variant="text"
          >
            {{ t('common.noData') }}
          </v-alert>

          <!-- Add Concept Button -->
          <v-btn
            prepend-icon="mdi-plus"
            variant="outlined"
            class="mt-2"
            data-testid="add-concept-btn"
            @click="$emit('add-concepts')"
          >
            {{ t('components.conceptSet.addConcepts') }}
          </v-btn>
        </v-card-text>
      </v-card>
    </v-card-text>

    <!-- Actions -->
    <v-card-actions>
      <v-spacer />
      <v-btn
        variant="text"
        data-testid="cancel-edit"
        @click="$emit('cancel')"
      >
        {{ t('common.cancel') }}
      </v-btn>
      <v-btn
        color="primary"
        variant="elevated"
        data-testid="save-concept-set"
        :disabled="!canSave"
        @click="$emit('save')"
      >
        {{ t('common.save') }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { ConceptSet } from '@/models/concept-set.types'

const { t, tv } = useI18n()

interface Props {
  modelValue?: ConceptSet
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: ConceptSet]
  'save': []
  'cancel': []
  'add-concepts': []
}>()

const concepts = computed(() => props.modelValue?.items || [])
const conceptCount = computed(() => concepts.value.length)
const canSave = computed(() => {
  return props.modelValue?.name && props.modelValue.name.trim().length > 0
})

function updateName(name: string) {
  if (!props.modelValue) return

  emit('update:modelValue', {
    ...props.modelValue,
    name,
  })
}

function removeConcept(index: number) {
  if (!props.modelValue) return

  const updatedItems = [...concepts.value]
  updatedItems.splice(index, 1)

  emit('update:modelValue', {
    ...props.modelValue,
    items: updatedItems,
  })
}

function updateIncludeDescendants(index: number, value: boolean) {
  if (!props.modelValue) return

  const updatedItems = [...concepts.value]
  const currentItem = updatedItems[index]
  if (!currentItem) return

  updatedItems[index] = {
    ...currentItem,
    includeDescendants: value,
  }

  emit('update:modelValue', {
    ...props.modelValue,
    items: updatedItems,
  })
}
</script>
