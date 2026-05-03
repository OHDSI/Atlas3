<template>
  <v-card>
    <v-card-title>
      {{
        t('cohortDefinitions.cohort.modals.cohortDefinition.title', 'Cohort Definition')
      }}
    </v-card-title>
    <v-card-text>
      <AtlasTextField
        v-model="localName"
        :label="t('columns.name', 'Name').value"
        :placeholder="
          t('components.atlasCohortEditor.enterCohortPlaceholder', 'Enter cohort name').value
        "
        variant="outlined"
        :rules="[rules.required]"
        @update:model-value="(v) => emit('update:name', String(v))"
      />

      <AtlasTextField
        v-model="localDescription"
        :label="t('columns.description', 'Description').value"
        :placeholder="
          t('common.enterCohortDescription', 'Enter cohort description (optional)').value
        "
        variant="outlined"
        :rows="3"
        multiline
        @update:model-value="(v) => emit('update:description', String(v))"
      />

      <!-- Tags Editor -->
      <div class="metadata-tags">
        <label class="metadata-tags__label">{{ t('common.tags', 'Tags') }}</label>

        <!-- Existing tags -->
        <div
          v-if="localTags.length > 0"
          class="metadata-tags__list"
        >
          <v-chip
            v-for="(tag, index) in localTags"
            :key="index"
            :color="tag.color || '#1f425a'"
            closable
            class="metadata-tags__chip"
            @click:close="removeTag(index)"
          >
            {{ tag.name }}
          </v-chip>
        </div>

        <!-- Add new tag -->
        <div class="metadata-tags__add">
          <v-text-field
            v-model="newTagName"
            :label="t('common.addTag', 'Add tag').value"
            :placeholder="t('components.tags.tagNamePlaceholder', 'Tag name').value"
            variant="outlined"
            density="compact"
            hide-details
            class="metadata-tags__input"
            @keyup.enter="addTag"
          >
            <template #append>
              <AtlasMenu
                v-model="showColorPicker"
                :close-on-content-click="false"
              >
                <template #activator="{ props: menuProps }">
                  <v-btn
                    v-bind="menuProps"
                    icon
                    size="small"
                    variant="text"
                  >
                    <AtlasIcon>mdi-palette</AtlasIcon>
                  </v-btn>
                </template>
                <v-card>
                  <v-card-text>
                    <v-color-picker
                      v-model="newTagColor"
                      hide-inputs
                      show-swatches
                      :swatches="colorSwatches"
                    />
                  </v-card-text>
                </v-card>
              </AtlasMenu>
              <v-btn
                icon
                size="small"
                variant="text"
                :disabled="!newTagName.trim()"
                @click="addTag"
              >
                <AtlasIcon>mdi-plus</AtlasIcon>
              </v-btn>
            </template>
          </v-text-field>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { AtlasIcon, AtlasMenu, AtlasTextField } from '@/components/ui'
import { ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { Tag } from '@/models/cohort.types'

const { t } = useI18n()

interface Props {
  name: string
  description?: string
  tags?: Tag[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:name': [value: string]
  'update:description': [value: string]
  'update:tags': [value: Tag[]]
}>()

const localName = ref(props.name)
const localDescription = ref(props.description ?? '')
const localTags = ref<Tag[]>(props.tags ?? [])

// Tag input state
const newTagName = ref('')
const newTagColor = ref('#1f425a')
const showColorPicker = ref(false)

// Color swatches for quick selection
const colorSwatches = [
  ['#1f425a', '#2d5f7f', '#3b7aa5', '#4995cb'],
  ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5'],
  ['#2196f3', '#03a9f4', '#00bcd4', '#009688'],
  ['#4caf50', '#8bc34a', '#cddc39', '#ffeb3b'],
  ['#ffc107', '#ff9800', '#ff5722', '#795548'],
]

// Sync with props changes
watch(
  () => props.name,
  newVal => {
    localName.value = newVal
  }
)

watch(
  () => props.description,
  newVal => {
    localDescription.value = newVal ?? ''
  }
)

watch(
  () => props.tags,
  newVal => {
    localTags.value = newVal ?? []
  },
  { deep: true }
)

// Add new tag
function addTag() {
  const trimmedName = newTagName.value.trim()
  if (!trimmedName) return

  // Check if tag already exists
  const exists = localTags.value.some(tag => tag.name === trimmedName)
  if (exists) {
    newTagName.value = ''
    return
  }

  const newTag: Tag = {
    name: trimmedName,
    color: newTagColor.value !== '#1f425a' ? newTagColor.value : undefined,
  }

  localTags.value.push(newTag)
  emit('update:tags', localTags.value)

  // Reset input
  newTagName.value = ''
  newTagColor.value = '#1f425a'
  showColorPicker.value = false
}

// Remove tag
function removeTag(index: number) {
  localTags.value.splice(index, 1)
  emit('update:tags', localTags.value)
}

const rules = {
  required: (value: string) =>
    !!value || t('commonErrors.required', 'This field is required').value,
}
</script>

<style scoped>
.metadata-tags {
  margin-top: 16px;
}

.metadata-tags__label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #666;
  margin-bottom: 12px;
}

.metadata-tags__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.metadata-tags__chip {
  font-size: 0.8125rem;
}

.metadata-tags__add {
  margin-top: 8px;
}

.metadata-tags__input {
  max-width: 100%;
}
</style>
