<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900px"
    scrollable
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">
          mdi-tag-multiple
        </v-icon>
        Manage Tags
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-4">
        <!-- Search Bar -->
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search tags..."
          clearable
          variant="outlined"
          density="compact"
          class="mb-4"
          hide-details
        />

        <!-- Selected Tags Preview -->
        <div
          v-if="localSelectedTags.length > 0"
          class="selected-tags-section mb-4"
        >
          <div class="d-flex align-center justify-space-between mb-2">
            <h4 class="text-subtitle-1">
              Selected Tags ({{ localSelectedTags.length }})
            </h4>
            <v-btn
              size="small"
              variant="text"
              color="error"
              @click="clearAll"
            >
              Clear All
            </v-btn>
          </div>
          <div class="selected-tags-chips">
            <v-chip
              v-for="tag in localSelectedTags"
              :key="tag.id || tag.name"
              :style="{ backgroundColor: tag.color || '#1976D2' }"
              closable
              class="ma-1"
              @click:close="deselectTag(tag)"
            >
              <span :style="{ color: getContrastColor(tag.color || '#1976D2') }">
                {{ tag.name }}
              </span>
            </v-chip>
          </div>
        </div>

        <v-divider
          v-if="localSelectedTags.length > 0"
          class="mb-4"
        />

        <!-- Loading State -->
        <div
          v-if="loading"
          class="text-center py-8"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          />
          <p class="text-body-2 mt-2">
            Loading tags...
          </p>
        </div>

        <!-- No Tag Groups Message -->
        <v-alert
          v-else-if="filteredTagGroups.length === 0 && !searchQuery"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          No tag groups found. Please create tag groups in the configuration panel first.
        </v-alert>

        <!-- No Search Results -->
        <v-alert
          v-else-if="filteredTagGroups.length === 0 && searchQuery"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          No tags found matching "{{ searchQuery }}"
        </v-alert>

        <!-- Tag Groups -->
        <v-expansion-panels
          v-else
          v-model="expandedPanels"
          multiple
        >
          <v-expansion-panel
            v-for="group in filteredTagGroups"
            :key="group.id"
            :value="group.id"
          >
            <v-expansion-panel-title>
              <div class="d-flex align-center justify-space-between w-100 mr-4">
                <div class="d-flex align-center">
                  <v-icon
                    v-if="group.icon"
                    :icon="group.icon"
                    :color="group.color"
                    class="mr-2"
                  />
                  <div
                    v-else-if="group.color"
                    class="color-dot mr-2"
                    :style="{ backgroundColor: group.color }"
                  />
                  <span>{{ group.name }}</span>
                </div>
                <v-badge
                  v-if="getGroupSelectionCount(group) > 0"
                  :content="getGroupSelectionCount(group)"
                  color="primary"
                  inline
                />
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div
                v-if="getGroupTags(group).length === 0"
                class="text-body-2 text-disabled pa-2"
              >
                No tags in this group yet.
              </div>
              <div
                v-else
                class="tag-chips-grid"
              >
                <v-chip
                  v-for="tag in getGroupTags(group)"
                  :key="tag.id"
                  :style="{
                    backgroundColor: isSelected(tag) ? tag.color || '#1976D2' : 'transparent',
                    borderColor: tag.color || '#1976D2',
                  }"
                  :variant="isSelected(tag) ? 'elevated' : 'outlined'"
                  class="ma-1"
                  @click="toggleTag(tag)"
                >
                  <v-icon
                    v-if="isSelected(tag)"
                    start
                    size="small"
                  >
                    mdi-check
                  </v-icon>
                  <v-icon
                    v-if="tag.icon"
                    :start="!isSelected(tag)"
                    size="small"
                  >
                    {{ tag.icon }}
                  </v-icon>
                  <span
                    :style="{
                      color: isSelected(tag) ? getContrastColor(tag.color || '#1976D2') : 'inherit',
                    }"
                  >
                    {{ tag.name }}
                  </span>
                </v-chip>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <v-divider class="my-4" />

        <!-- Create New Tag Section -->
        <v-expansion-panels v-model="showCreateForm">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon start>
                mdi-plus
              </v-icon>
              Create New Tag
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <create-tag-form
                :tag-groups="configStore.tagGroups"
                @created="handleTagCreated"
                @cancel="showCreateForm = undefined"
              />
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="cancel"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          @click="apply"
        >
          Apply
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import type { Tag } from '@/models/cohort.types'
import type { Tag as ConfigTag, TagGroup } from '@/models/config.types'
import CreateTagForm from './CreateTagForm.vue'
import { logger } from '@/utils/logger'

interface Props {
  modelValue: boolean
  selectedTags: Tag[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:selected-tags': [tags: Tag[]]
}>()

const configStore = useConfigStore()

const searchQuery = ref('')
const localSelectedTags = ref<Tag[]>([])
const loading = ref(false)
const expandedPanels = ref<number[]>([])
const showCreateForm = ref<number | undefined>(undefined)

watch(
  () => props.modelValue,
  async isOpen => {
    if (isOpen) {
      await loadTags()
      localSelectedTags.value = [...props.selectedTags]
      expandPanelsWithSelections()
    }
  }
)

onMounted(async () => {
  if (props.modelValue) {
    await loadTags()
    localSelectedTags.value = [...props.selectedTags]
    expandPanelsWithSelections()
  }
})

async function loadTags() {
  loading.value = true
  try {
    if (configStore.allTags.length === 0) {
      await configStore.fetchTagGroups()
    }
  } catch (error) {
    logger.error('TagSelectionDialog', 'Failed to load tags', error)
  } finally {
    loading.value = false
  }
}

const tagGroups = computed(() => {
  return configStore.allTags.filter(tag => tag.groups?.length === 0)
})

const filteredTagGroups = computed(() => {
  if (!searchQuery.value) {
    return tagGroups.value
  }

  const query = searchQuery.value.toLowerCase()

  return tagGroups.value.filter(group => {
    if (group.name.toLowerCase().includes(query)) {
      return true
    }

    const groupTags = getGroupTags(group)
    return groupTags.some(tag => tag.name.toLowerCase().includes(query))
  })
})

function getGroupTags(group: TagGroup): ConfigTag[] {
  if (!group.id) return []

  const tags = configStore.allTags.filter(
    tag => tag.groups?.length > 0 && tag.groups.some(g => g.id === group.id)
  )

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    return tags.filter(tag => tag.name.toLowerCase().includes(query))
  }

  return tags
}

function getGroupSelectionCount(group: TagGroup): number {
  const groupTags = getGroupTags(group)
  return groupTags.filter(tag => localSelectedTags.value.some(selected => selected.id === tag.id))
    .length
}

function isSelected(tag: ConfigTag): boolean {
  return localSelectedTags.value.some(selected => selected.id === tag.id)
}

function toggleTag(tag: ConfigTag) {
  const index = localSelectedTags.value.findIndex(selected => selected.id === tag.id)

  if (index >= 0) {
    localSelectedTags.value.splice(index, 1)
  } else {
    localSelectedTags.value.push({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    })
  }
}

function deselectTag(tag: Tag) {
  const index = localSelectedTags.value.findIndex(
    selected => selected.id === tag.id || selected.name === tag.name
  )

  if (index >= 0) {
    localSelectedTags.value.splice(index, 1)
  }
}

function clearAll() {
  localSelectedTags.value = []
}

function handleTagCreated(tag: Tag) {
  localSelectedTags.value.push(tag)
  showCreateForm.value = undefined
  expandPanelsWithSelections()
}

function expandPanelsWithSelections() {
  const groupsWithSelections = tagGroups.value
    .filter(group => getGroupSelectionCount(group) > 0)
    .map(group => group.id)
    .filter((id): id is number => id !== undefined)

  expandedPanels.value = groupsWithSelections
}

function apply() {
  emit('update:selected-tags', localSelectedTags.value)
  emit('update:modelValue', false)
}

function cancel() {
  localSelectedTags.value = [...props.selectedTags]
  emit('update:modelValue', false)
}

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}
</script>

<style scoped>
.selected-tags-section {
  background-color: rgba(var(--v-theme-primary), 0.05);
  padding: 16px;
  border-radius: 8px;
}

.selected-tags-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-chips-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 0;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.v-chip {
  cursor: pointer;
  transition: all 0.2s ease;
}

.v-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
