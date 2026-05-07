<template>
  <v-card>
    <v-card-title>
      {{
        modelValue?.id
          ? t('components.conceptSet.actionEdit')
          : t('components.conceptSet.actionCreate')
      }}
    </v-card-title>
    <v-card-text>
      <!-- Concept Set Name -->
      <AtlasTextField
        :model-value="modelValue?.name || ''"
        :label="tv('components.conceptSet.name')"
        :placeholder="tv('conceptSetEditor.namePlaceholder')"
        data-testid="concept-set-name"
        @update:model-value="(v) => updateName(String(v))"
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
          <AtlasList
            v-if="concepts.length > 0"
            data-testid="concept-list"
          >
            <AtlasListItem
              v-for="(item, index) in concepts"
              :key="item.conceptId"
            >
              <v-list-item-title>
                <router-link
                  v-if="sourceKey"
                  :to="`/concept/${sourceKey}/${item.conceptId}`"
                  :data-testid="`concept-name-link-${item.conceptId}`"
                  class="concept-name-link"
                >
                  {{ item.conceptName }}
                </router-link>
                <template v-else>
                  {{ item.conceptName }}
                </template>
              </v-list-item-title>
              <v-list-item-subtitle>
                {{
                  t('conceptSetEditor.conceptDetails', {
                    id: item.conceptId,
                    domain: item.domainId,
                    vocabulary: item.vocabularyId,
                  })
                }}
              </v-list-item-subtitle>

              <template #append>
                <!-- Include Descendants Checkbox -->
                <AtlasCheckbox
                  :model-value="item.includeDescendants"
                  :label="tv('columns.descendants')"
                  hide-details
                  :data-testid="`include-descendants-${index}`"
                  @update:model-value="val => updateIncludeDescendants(index, val ?? false)"
                />

                <!-- Remove Button -->
                <AtlasIconButton
                  icon="mdi-delete"
                  v-bind="{ ariaLabel: 'Remove concept' }"
                  variant="text"
                  tone="danger"
                  size="sm"
                  :data-testid="`remove-concept-${index}`"
                  @click="removeConcept(index)"
                />
              </template>
            </AtlasListItem>
          </AtlasList>

          <AtlasAlert
            v-else
            severity="info"
            variant="flat"
          >
            {{ t('common.noData') }}
          </AtlasAlert>

          <!-- Add Concept Button -->
          <AtlasButton
            variant="secondary"
            icon="mdi-plus"
            class="mt-2"
            data-testid="add-concept-btn"
            @click="$emit('add-concepts')"
          >
            {{ t('components.conceptSet.addConcepts') }}
          </AtlasButton>
        </v-card-text>
      </v-card>
    </v-card-text>

    <!-- Actions -->
    <v-card-actions>
      <AtlasSpacer />
      <AtlasButton
        variant="ghost"
        data-testid="cancel-edit"
        @click="$emit('cancel')"
      >
        {{ t('common.cancel') }}
      </AtlasButton>
      <AtlasButton
        variant="primary"
        data-testid="save-concept-set"
        :disabled="!canSave"
        @click="$emit('save')"
      >
        {{ t('common.save') }}
      </AtlasButton>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasCheckbox, AtlasIconButton, AtlasList, AtlasListItem, AtlasSpacer, AtlasTextField } from '@/components/ui'
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useWebAPIStore } from '@/stores/webapi'
import { getSourceKey as getDefaultSourceKey } from '@/config/webapi'
import type { ConceptSet } from '@/models/concept-set.types'

const { t, tv } = useI18n()
const webapiStore = useWebAPIStore()
const sourceKey = computed(
  () => webapiStore.getValidVocabularySource() || getDefaultSourceKey() || '',
)

interface Props {
  modelValue?: ConceptSet
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: ConceptSet]
  save: []
  cancel: []
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

<style scoped>
.concept-name-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.concept-name-link:hover {
  text-decoration: underline;
}
</style>
