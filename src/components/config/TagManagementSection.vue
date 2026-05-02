<template>
  <div class="tag-management-section">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Tag Management</span>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="openCreateGroupDialog"
        >
          Create Tag Group
        </v-btn>
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
              <v-btn
                variant="text"
                size="small"
                prepend-icon="mdi-arrow-left"
                @click="selectedGroup = null"
              >
                Back to Tag Groups
              </v-btn>
            </div>
            <v-tooltip
              :disabled="selectedGroup.allowCustom"
              location="bottom"
              text="Enable 'Free-form' on this tag group to allow custom tags."
            >
              <template #activator="{ props: tooltipProps }">
                <span v-bind="tooltipProps">
                  <v-btn
                    color="primary"
                    prepend-icon="mdi-plus"
                    size="small"
                    :disabled="!selectedGroup.allowCustom"
                    @click="openCreateTagDialog"
                  >
                    Create Tag
                  </v-btn>
                </span>
              </template>
            </v-tooltip>
          </div>

          <v-alert
            v-if="!selectedGroup.allowCustom"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            This tag group does not allow custom tags. Edit the group and enable
            <strong>Free-form</strong> to add tags here.
          </v-alert>

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
    <v-dialog
      v-model="showDeleteGroupDialog"
      max-width="400"
    >
      <v-card>
        <v-card-title>Delete Tag Group</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ selectedTagGroup?.name }}"?
          <v-alert
            v-if="deleteError"
            type="error"
            variant="tonal"
            class="mt-3"
          >
            {{ deleteError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showDeleteGroupDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="isDeleting"
            @click="handleDeleteGroup"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Tag Confirmation Dialog -->
    <v-dialog
      v-model="showDeleteTagDialog"
      max-width="400"
    >
      <v-card>
        <v-card-title>Delete Tag</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ selectedTag?.name }}"? This will unassign the tag from
          all assets.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showDeleteTagDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="isDeleting"
            @click="handleDeleteTag"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success Toast -->
    <v-snackbar
      v-model="showToast"
      :timeout="5000"
      color="success"
      location="bottom"
    >
      {{ toastMessage }}
      <template #actions>
        <v-btn
          variant="text"
          @click="showToast = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Error Toast -->
    <v-snackbar
      v-model="showErrorToast"
      :timeout="5000"
      color="error"
      location="bottom"
    >
      {{ errorMessage }}
      <template #actions>
        <v-btn
          variant="text"
          @click="showErrorToast = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
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
