<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="TAGS"
    :title="t('components.tags.manageTags', 'Manage Tags').value"
    max-width="900"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
    @close="cancel"
  >
    <div class="pt-4">
      <!-- Search Bar -->
      <AtlasTextField
        v-model="searchQuery"
        prepend-icon="mdi-magnify"
        :placeholder="t('components.tags.searchTagsPlaceholder', 'Search tags...').value"
        clearable
        variant="outlined"
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
            {{ t('tagging.multiAssign.selectedTags', 'Selected Tags').value }} ({{ localSelectedTags.length }})
          </h4>
          <AtlasButton
            size="sm"
            variant="ghost"
            @click="clearAll"
          >
            {{ t('components.tags.clearAll', 'Clear All').value }}
          </AtlasButton>
        </div>
        <div class="selected-tags-chips">
          <AtlasChip
            v-for="tag in localSelectedTags"
            :key="tag.id || tag.name"
            :style="{ backgroundColor: tag.color || '#1976D2' }"
            closable
            class="ma-1"
            @close="deselectTag(tag)"
          >
            <span :style="{ color: getContrastColor(tag.color || '#1976D2') }">
              {{ tag.name }}
            </span>
          </AtlasChip>
        </div>
      </div>

      <AtlasDivider
        v-if="localSelectedTags.length > 0"
        class="mb-4"
      />

      <!-- Loading State -->
      <div
        v-if="loading"
        class="text-center py-8"
      >
        <AtlasProgressCircular
          indeterminate
          color="primary"
        />
        <p class="text-body-2 mt-2">
          {{ t('components.tags.loadingTags', 'Loading tags...').value }}
        </p>
      </div>

      <!-- No Tag Groups Message -->
      <AtlasAlert
        v-else-if="filteredTagGroups.length === 0 && !searchQuery"
        severity="info"
        class="mb-4"
      >
        {{ t('components.tags.noTagGroups', 'No tag groups found. Please create tag groups in the configuration panel first.').value }}
      </AtlasAlert>

      <AtlasAlert
        v-else-if="filteredTagGroups.length === 0 && searchQuery"
        severity="info"
        class="mb-4"
      >
        {{ t('components.tags.noTagsMatching', 'No tags found matching "{query}"', { query: searchQuery }).value }}
      </AtlasAlert>

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
                <AtlasIcon
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
              <AtlasBadge
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
              {{ t('components.tags.noTagsInGroup', 'No tags in this group yet.').value }}
            </div>
            <div
              v-else
              class="tag-chips-grid"
            >
              <AtlasChip
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
                <AtlasIcon
                  v-if="isSelected(tag)"
                  start
                  size="small"
                >
                  mdi-check
                </AtlasIcon>
                <AtlasIcon
                  v-if="tag.icon"
                  :start="!isSelected(tag)"
                  size="small"
                >
                  {{ tag.icon }}
                </AtlasIcon>
                <span
                  :style="{
                    color: isSelected(tag) ? getContrastColor(tag.color || '#1976D2') : 'inherit',
                  }"
                >
                  {{ tag.name }}
                </span>
              </AtlasChip>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <AtlasDivider class="my-4" />

      <!-- Create New Tag Section -->
      <v-expansion-panels v-model="showCreateForm">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <AtlasIcon start>
              mdi-plus
            </AtlasIcon>
            {{ t('components.tags.createNewTag', 'Create New Tag').value }}
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
    </div>
    <template #actions>
      <AtlasButton
        variant="ghost"
        @click="cancel"
      >
        {{ t('common.cancel', 'Cancel').value }}
      </AtlasButton>
      <AtlasButton
        @click="apply"
      >
        {{ t('components.filterPanel.buttons.apply', 'Apply').value }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasBadge, AtlasChip, AtlasDialog, AtlasDivider, AtlasIcon, AtlasProgressCircular, AtlasTextField } from '@/components/ui'
import { ref, computed, watch, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import type { Tag } from '@/models/cohort.types'
import type { Tag as ConfigTag, TagGroup } from '@/models/config.types'
import CreateTagForm from '@/components/tags/CreateTagForm.vue'
import { useI18n } from '@/composables/useI18n'
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

const { t } = useI18n()
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
  border: 1px solid var(--atlas-color-outline-strong);
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
