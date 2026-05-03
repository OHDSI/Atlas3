<template>
  <v-card class="role-details">
    <v-card-text>
      <!-- Role Name Display/Edit -->
      <div class="role-details__section">
        <div class="role-details__field">
          <div class="role-details__label">
            Role Name
          </div>
          <div
            v-if="!isEditingName"
            class="role-details__value"
          >
            <span class="role-details__name">{{ role.name }}</span>
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              @click="startEditName"
            >
              <AtlasIcon size="small">
                mdi-pencil
              </AtlasIcon>
              <AtlasTooltip activator="parent">
                Edit Role Name
              </AtlasTooltip>
            </v-btn>
          </div>
          <div
            v-else
            class="role-details__edit"
          >
            <v-text-field
              v-model="editedName"
              :rules="nameRules"
              variant="outlined"
              density="compact"
              hide-details="auto"
              autofocus
              @keyup.enter="saveName"
              @keyup.esc="cancelEditName"
            />
            <div class="role-details__edit-actions">
              <v-btn
                color="primary"
                size="small"
                :disabled="!isNameValid"
                :loading="isSaving"
                @click="saveName"
              >
                Save
              </v-btn>
              <v-btn
                variant="text"
                size="small"
                :disabled="isSaving"
                @click="cancelEditName"
              >
                Cancel
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- Role Description Display/Edit -->
      <div class="role-details__section">
        <div class="role-details__field">
          <div class="role-details__label">
            Description
          </div>
          <div
            v-if="!isEditingDescription"
            class="role-details__value"
          >
            <span class="role-details__description">
              {{ role.description || 'No description provided' }}
            </span>
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              @click="startEditDescription"
            >
              <AtlasIcon size="small">
                mdi-pencil
              </AtlasIcon>
              <AtlasTooltip activator="parent">
                Edit Description
              </AtlasTooltip>
            </v-btn>
          </div>
          <div
            v-else
            class="role-details__edit"
          >
            <v-textarea
              v-model="editedDescription"
              variant="outlined"
              density="compact"
              rows="3"
              hide-details="auto"
              autofocus
            />
            <div class="role-details__edit-actions">
              <v-btn
                color="primary"
                size="small"
                :loading="isSaving"
                @click="saveDescription"
              >
                Save
              </v-btn>
              <v-btn
                variant="text"
                size="small"
                :disabled="isSaving"
                @click="cancelEditDescription"
              >
                Cancel
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- Role Metadata -->
      <div class="role-details__section">
        <div class="role-details__metadata">
          <div
            v-if="role.createdDate"
            class="role-details__metadata-item"
          >
            <AtlasIcon
              size="small"
              class="mr-2"
            >
              mdi-calendar-plus
            </AtlasIcon>
            <span class="text-caption"> Created: {{ formatDate(role.createdDate) }} </span>
          </div>
          <div
            v-if="role.modifiedDate"
            class="role-details__metadata-item"
          >
            <AtlasIcon
              size="small"
              class="mr-2"
            >
              mdi-calendar-edit
            </AtlasIcon>
            <span class="text-caption"> Modified: {{ formatDate(role.modifiedDate) }} </span>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        class="mt-4"
        closable
        @click:close="errorMessage = null"
      >
        {{ errorMessage }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { AtlasIcon, AtlasTooltip } from '@/components/ui'
import { ref, computed } from 'vue'
import { useRoles } from '@/composables/useRoles'
import type { Role } from '@/models/role.types'

interface Props {
  role: Role
}

const props = defineProps<Props>()

const { updateRole, roles } = useRoles()

// Edit state
const isEditingName = ref(false)
const isEditingDescription = ref(false)
const editedName = ref('')
const editedDescription = ref('')
const isSaving = ref(false)
const errorMessage = ref<string | null>(null)

// Validation rules
const nameRules = [
  (v: string) => !!v || 'Role name is required',
  (v: string) => (v && v.trim().length > 0) || 'Role name cannot be empty',
  (v: string) => (v && v.length <= 255) || 'Role name must be less than 255 characters',
  (v: string) => {
    if (!v) return true
    const trimmedName = v.trim().toLowerCase()
    const isDuplicate = roles.value.some(
      r => r.name.toLowerCase() === trimmedName && r.id !== props.role.id
    )
    return !isDuplicate || 'A role with this name already exists'
  },
]

const isNameValid = computed(() => {
  if (!editedName.value) return false
  return nameRules.every(rule => rule(editedName.value) === true)
})

/**
 * Format date for display
 */
function formatDate(dateString?: string): string {
  if (!dateString) return '—'

  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return '—'
  }
}

/**
 * Start editing role name
 */
function startEditName() {
  editedName.value = props.role.name
  isEditingName.value = true
  errorMessage.value = null
}

/**
 * Cancel editing role name
 */
function cancelEditName() {
  isEditingName.value = false
  editedName.value = ''
  errorMessage.value = null
}

/**
 * Save role name
 */
async function saveName() {
  if (!isNameValid.value) return

  isSaving.value = true
  errorMessage.value = null

  try {
    const success = await updateRole(props.role.id, {
      name: editedName.value.trim(),
    })

    if (success) {
      isEditingName.value = false
      editedName.value = ''
    } else {
      errorMessage.value = 'Failed to update role name. Please try again.'
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'An unexpected error occurred'
  } finally {
    isSaving.value = false
  }
}

/**
 * Start editing description
 */
function startEditDescription() {
  editedDescription.value = props.role.description || ''
  isEditingDescription.value = true
  errorMessage.value = null
}

/**
 * Cancel editing description
 */
function cancelEditDescription() {
  isEditingDescription.value = false
  editedDescription.value = ''
  errorMessage.value = null
}

/**
 * Save description
 */
async function saveDescription() {
  isSaving.value = true
  errorMessage.value = null

  try {
    const success = await updateRole(props.role.id, {
      description: editedDescription.value.trim() || undefined,
    })

    if (success) {
      isEditingDescription.value = false
      editedDescription.value = ''
    } else {
      errorMessage.value = 'Failed to update description. Please try again.'
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'An unexpected error occurred'
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.role-details {
  border-radius: 4px;
}

.role-details__section {
  margin-bottom: 24px;
}

.role-details__section:last-child {
  margin-bottom: 0;
}

.role-details__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role-details__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
}

.role-details__value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-details__name {
  font-size: 1.25rem;
  font-weight: 500;
}

.role-details__description {
  color: rgba(0, 0, 0, 0.87);
}

.role-details__edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-details__edit-actions {
  display: flex;
  gap: 8px;
}

.role-details__metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.role-details__metadata-item {
  display: flex;
  align-items: center;
  color: rgba(0, 0, 0, 0.6);
}
</style>
