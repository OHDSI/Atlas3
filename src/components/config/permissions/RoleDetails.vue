<template>
  <v-card class="role-details">
    <v-card-text>
      <!-- Role Name Display/Edit -->
      <div class="role-details__section">
        <div class="role-details__field">
          <div class="role-details__label">
            {{ t('components.config.permissions.roleName', 'Role Name').value }}
          </div>
          <div
            v-if="!isEditingName"
            class="role-details__value"
          >
            <span class="role-details__name">{{ role.name }}</span>
            <AtlasIconButton
              icon="mdi-pencil"
              v-bind="{ ariaLabel: tv('components.config.permissions.editRoleNameAria', 'Edit Role Name') }"
              size="sm"
              variant="text"
              :title="tv('components.config.permissions.editRoleNameAria', 'Edit Role Name')"
              @click="startEditName"
            />
          </div>
          <div
            v-else
            class="role-details__edit"
          >
            <AtlasTextField
              v-model="editedName"
              :rules="nameRules"
              variant="outlined"
              hide-details="auto"
              @keyup.enter="saveName"
              @keyup.esc="cancelEditName"
            />
            <div class="role-details__edit-actions">
              <AtlasButton
                size="sm"
                :disabled="!isNameValid"
                :loading="isSaving"
                @click="saveName"
              >
                {{ t('common.save', 'Save').value }}
              </AtlasButton>
              <AtlasButton
                variant="ghost"
                size="sm"
                :disabled="isSaving"
                @click="cancelEditName"
              >
                {{ t('common.cancel', 'Cancel').value }}
              </AtlasButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Role Description Display/Edit -->
      <div class="role-details__section">
        <div class="role-details__field">
          <div class="role-details__label">
            {{ t('common.description', 'Description').value }}
          </div>
          <div
            v-if="!isEditingDescription"
            class="role-details__value"
          >
            <span class="role-details__description">
              {{ role.description || t('components.config.permissions.noDescriptionProvided', 'No description provided').value }}
            </span>
            <AtlasIconButton
              icon="mdi-pencil"
              v-bind="{ ariaLabel: tv('components.config.permissions.editDescriptionAria', 'Edit Description') }"
              size="sm"
              variant="text"
              :title="tv('components.config.permissions.editDescriptionAria', 'Edit Description')"
              @click="startEditDescription"
            />
          </div>
          <div
            v-else
            class="role-details__edit"
          >
            <AtlasTextField
              v-model="editedDescription"
              variant="outlined"
              :rows="3"
              multiline
              hide-details="auto"
            />
            <div class="role-details__edit-actions">
              <AtlasButton
                size="sm"
                :loading="isSaving"
                @click="saveDescription"
              >
                {{ t('common.save', 'Save').value }}
              </AtlasButton>
              <AtlasButton
                variant="ghost"
                size="sm"
                :disabled="isSaving"
                @click="cancelEditDescription"
              >
                {{ t('common.cancel', 'Cancel').value }}
              </AtlasButton>
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
            <span class="text-caption">
              {{ t('columns.created', 'Created').value }}: {{ formatDate(role.createdDate) }}
            </span>
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
            <span class="text-caption">
              {{ t('columns.modified', 'Modified').value }}: {{ formatDate(role.modifiedDate) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <AtlasAlert
        v-if="errorMessage"
        severity="danger"
        class="mt-4"
        :closable="true"
        @close="errorMessage = null"
      >
        {{ errorMessage }}
      </AtlasAlert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasIcon, AtlasIconButton, AtlasTextField } from '@/components/ui'
import { ref, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useRoles } from '@/composables/useRoles'
import type { Role } from '@/models/role.types'

interface Props {
  role: Role
}

const props = defineProps<Props>()

const { t, tv } = useI18n()
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
  (v: string) => !!v || tv('components.config.permissions.roleNameRequired', 'Role name is required'),
  (v: string) =>
    (v && v.trim().length > 0) ||
    tv('components.config.permissions.roleNameEmpty', 'Role name cannot be empty'),
  (v: string) =>
    (v && v.length <= 255) ||
    tv('components.config.permissions.roleNameTooLong', 'Role name must be less than 255 characters'),
  (v: string) => {
    if (!v) return true
    const trimmedName = v.trim().toLowerCase()
    const isDuplicate = roles.value.some(
      r => r.name.toLowerCase() === trimmedName && r.id !== props.role.id
    )
    return (
      !isDuplicate ||
      tv('components.config.permissions.roleNameExists', 'A role with this name already exists')
    )
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
      errorMessage.value = tv(
        'components.config.permissions.updateRoleNameError',
        'Failed to update role name. Please try again.'
      )
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : tv('components.config.permissions.unexpectedError', 'An unexpected error occurred')
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
      errorMessage.value = tv(
        'components.config.permissions.updateDescriptionError',
        'Failed to update description. Please try again.'
      )
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : tv('components.config.permissions.unexpectedError', 'An unexpected error occurred')
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
.v-theme--dark .role-details__label {
  color: var(--atlas-color-on-surface-variant);
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
  color: var(--atlas-color-on-surface);
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
  border-top: 1px solid var(--atlas-color-outline-strong);
}

.role-details__metadata-item {
  display: flex;
  align-items: center;
  color: rgba(0, 0, 0, 0.6);
}
.v-theme--dark .role-details__metadata-item {
  color: var(--atlas-color-on-surface-variant);
}
</style>
