<template>
  <div class="tag-management-section">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Tag Management</span>
        <AtlasButton
          icon="mdi-plus"
          @click="openCreateGroupDialog"
        >
          Create Tag Group
        </AtlasButton>
      </v-card-title>

      <v-card-text>
        <p class="text-body-1 mb-4">
          Manage tag groups for organizing and categorizing cohorts and concept sets. Tag groups
          allow you to apply structured metadata to your assets.
        </p>

        <!-- Tag Groups Table -->
        <TagGroupTable
          :items="configStore.tagGroups"
          :loading="configStore.isLoadingTagGroups"
          @edit="openEditGroupDialog"
          @delete="confirmDeleteGroup"
          @show-tags="handleShowTags"
        />

        <!-- Tags for Selected Group -->
        <div
          v-if="selectedGroup"
          class="mt-6"
        >
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <h3 class="text-h6">
                Tags in "{{ selectedGroup.name }}"
              </h3>
              <AtlasButton
                variant="ghost"
                size="sm"
                icon="mdi-arrow-left"
                @click="selectedGroup = null"
              >
                Back to Tag Groups
              </AtlasButton>
            </div>
            <AtlasTooltip
              :disabled="selectedGroup.allowCustom"
              location="bottom"
              text="Enable 'Free-form' on this tag group to allow custom tags."
            >
              <template #activator="{ props: tooltipProps }">
                <span v-bind="tooltipProps">
                  <AtlasButton
                    size="sm"
                    icon="mdi-plus"
                    :disabled="!selectedGroup.allowCustom"
                    @click="openCreateTagDialog"
                  >
                    Create Tag
                  </AtlasButton>
                </span>
              </template>
            </AtlasTooltip>
          </div>

          <AtlasAlert
            v-if="!selectedGroup.allowCustom"
            severity="info"
            density="compact"
            class="mb-3"
          >
            This tag group does not allow custom tags. Edit the group and enable
            <strong>Free-form</strong> to add tags here.
          </AtlasAlert>

          <TagTable
            :items="groupTags"
            :loading="false"
            @edit="openEditTagDialog"
            @delete="confirmDeleteTag"
          />
        </div>
      </v-card-text>
    </v-card>

    <!-- Create/Edit Tag Group Dialog -->
    <TagGroupDialog
      v-model="showGroupDialog"
      :tag-group="selectedTagGroup"
      @save="handleSaveGroup"
    />

    <!-- Create/Edit Tag Dialog -->
    <TagDialog
      v-if="selectedGroup"
      v-model="showTagDialog"
      :tag="selectedTag"
      :tag-group="selectedGroup"
      @save="handleSaveTag"
    />

    <!-- Delete Tag Group Confirmation Dialog -->
    <AtlasDialog
      v-model="showDeleteGroupDialog"
      eyebrow="TAGS"
      title="Delete Tag Group"
      max-width="400"
      @close="showDeleteGroupDialog = false"
    >
      Are you sure you want to delete "{{ selectedTagGroup?.name }}"?
      <AtlasAlert
        v-if="deleteError"
        severity="danger"
        class="mt-3"
      >
        {{ deleteError }}
      </AtlasAlert>
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="showDeleteGroupDialog = false"
        >
          Cancel
        </AtlasButton>
        <AtlasButton
          variant="danger"
          :loading="isDeleting"
          @click="handleDeleteGroup"
        >
          Delete
        </AtlasButton>
      </template>
    </AtlasDialog>

    <!-- Delete Tag Confirmation Dialog -->
    <AtlasDialog
      v-model="showDeleteTagDialog"
      eyebrow="TAGS"
      title="Delete Tag"
      max-width="400"
      @close="showDeleteTagDialog = false"
    >
      Are you sure you want to delete "{{ selectedTag?.name }}"? This will unassign the tag from
      all assets.
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="showDeleteTagDialog = false"
        >
          Cancel
        </AtlasButton>
        <AtlasButton
          variant="danger"
          :loading="isDeleting"
          @click="handleDeleteTag"
        >
          Delete
        </AtlasButton>
      </template>
    </AtlasDialog>

    <AtlasSnackbar
      v-model="showToast"
      severity="success"
      :text="toastMessage"
      :timeout="5000"
      location="bottom"
    />

    <AtlasSnackbar
      v-model="showErrorToast"
      severity="danger"
      :text="errorMessage"
      :timeout="5000"
      location="bottom"
    />
  </div>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasDialog, AtlasSnackbar, AtlasTooltip } from '@/components/ui'
import { ref, computed, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import type { Tag, TagGroup } from '@/models/config.types'
import TagGroupTable from './TagGroupTable.vue'
import TagGroupDialog from './TagGroupDialog.vue'
import TagTable from './TagTable.vue'
import TagDialog from './TagDialog.vue'

const configStore = useConfigStore()

// State
const selectedGroup = ref<TagGroup | null>(null)
const selectedTagGroup = ref<TagGroup | null>(null)
const selectedTag = ref<Tag | null>(null)
const showGroupDialog = ref(false)
const showTagDialog = ref(false)
const showDeleteGroupDialog = ref(false)
const showDeleteTagDialog = ref(false)
const isDeleting = ref(false)
const deleteError = ref<string | null>(null)
const showToast = ref(false)
const showErrorToast = ref(false)
const toastMessage = ref('')
const errorMessage = ref('')

// Computed tags for selected group
const groupTags = computed(() => {
  if (!selectedGroup.value?.id) return []
  return configStore.getTagsForGroup(selectedGroup.value.id)
})

/**
 * Load tag groups on mount
 */
onMounted(async () => {
  try {
    await configStore.fetchTagGroups()
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load tag groups'
    showErrorToast.value = true
  }
})

/**
 * Handle show tags for a group
 */
function handleShowTags(group: TagGroup) {
  selectedGroup.value = group
}

/**
 * Open create tag group dialog
 */
function openCreateGroupDialog() {
  selectedTagGroup.value = null
  showGroupDialog.value = true
}

/**
 * Open edit tag group dialog
 */
function openEditGroupDialog(tagGroup: TagGroup) {
  // Clone to prevent direct mutation
  selectedTagGroup.value = JSON.parse(JSON.stringify(tagGroup))
  showGroupDialog.value = true
}

/**
 * Open delete tag group confirmation
 */
function confirmDeleteGroup(tagGroup: TagGroup) {
  selectedTagGroup.value = tagGroup
  deleteError.value = null
  showDeleteGroupDialog.value = true
}

/**
 * Handle save tag group (create or update)
 */
async function handleSaveGroup(tagGroup: TagGroup) {
  try {
    if (tagGroup.id) {
      // Update existing
      await configStore.updateTagGroup(tagGroup)
      toastMessage.value = `Tag group "${tagGroup.name}" updated`
    } else {
      // Create new
      await configStore.createTagGroup(tagGroup)
      toastMessage.value = `Tag group "${tagGroup.name}" created`
    }

    showGroupDialog.value = false
    showToast.value = true
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to save tag group'
    showErrorToast.value = true
  }
}

/**
 * Handle delete tag group
 */
async function handleDeleteGroup() {
  if (!selectedTagGroup.value?.id) return

  isDeleting.value = true
  deleteError.value = null

  try {
    // Check if group has tags
    const tags = configStore.getTagsForGroup(selectedTagGroup.value.id)
    if (tags.length > 0) {
      deleteError.value = 'Cannot delete tag group: the group contains tags'
      return
    }

    await configStore.deleteTagGroup(selectedTagGroup.value.id)

    showDeleteGroupDialog.value = false
    toastMessage.value = `Tag group "${selectedTagGroup.value.name}" deleted`
    showToast.value = true
  } catch (error: unknown) {
    deleteError.value = error instanceof Error ? error.message : 'Failed to delete tag group'
  } finally {
    isDeleting.value = false
  }
}

/**
 * Open create tag dialog
 */
function openCreateTagDialog() {
  selectedTag.value = null
  showTagDialog.value = true
}

/**
 * Open edit tag dialog
 */
function openEditTagDialog(tag: Tag) {
  // Clone to prevent direct mutation
  selectedTag.value = JSON.parse(JSON.stringify(tag))
  showTagDialog.value = true
}

/**
 * Open delete tag confirmation
 */
function confirmDeleteTag(tag: Tag) {
  selectedTag.value = tag
  showDeleteTagDialog.value = true
}

/**
 * Handle save tag (create or update)
 */
async function handleSaveTag(tag: Tag) {
  try {
    if (tag.id) {
      // Update existing
      await configStore.updateTag(tag)
      toastMessage.value = `Tag "${tag.name}" updated`
    } else {
      // Create new
      await configStore.createTag(tag)
      toastMessage.value = `Tag "${tag.name}" created`
    }

    showTagDialog.value = false
    showToast.value = true
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to save tag'
    showErrorToast.value = true
  }
}

/**
 * Handle delete tag
 */
async function handleDeleteTag() {
  if (!selectedTag.value?.id) return

  isDeleting.value = true

  try {
    await configStore.deleteTag(selectedTag.value.id)

    showDeleteTagDialog.value = false
    toastMessage.value = `Tag "${selectedTag.value.name}" deleted`
    showToast.value = true
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to delete tag'
    showErrorToast.value = true
  } finally {
    isDeleting.value = false
  }
}
</script>

<style scoped>
.tag-management-section {
  max-width: 100%;
}
</style>
