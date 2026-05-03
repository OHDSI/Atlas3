<template>
  <v-card class="role-users-tab">
    <v-card-text>
      <!-- Header with Search and Save Button -->
      <div class="role-users-tab__header">
        <v-text-field
          v-model="searchQuery"
          placeholder="Search users by login or email..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="role-users-tab__search"
          style="max-width: 400px"
        />

        <div class="role-users-tab__actions">
          <v-chip
            v-if="hasChanges"
            color="warning"
            size="small"
            class="mr-2"
          >
            {{ changeCount }} change{{ changeCount !== 1 ? 's' : '' }}
          </v-chip>

          <v-btn
            color="primary"
            :disabled="!hasChanges || isSaving"
            :loading="isSaving"
            @click="handleSave"
          >
            Save Changes
          </v-btn>
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="isLoadingUsers"
        class="role-users-tab__loading"
      >
        <AtlasProgressCircular
          indeterminate
          color="primary"
          size="64"
        />
        <p class="text-body-1 mt-4">
          Loading users...
        </p>
      </div>

      <!-- Error State -->
      <v-alert
        v-else-if="usersError"
        type="error"
        variant="tonal"
        class="mt-4"
        closable
        @click:close="usersError = null"
      >
        {{ usersError }}
      </v-alert>

      <!-- Users List -->
      <template v-else>
        <!-- Summary -->
        <div class="role-users-tab__summary mt-4">
          <AtlasIcon
            size="small"
            class="mr-2"
          >
            mdi-account-multiple
          </AtlasIcon>
          <span class="text-body-2">
            <strong>{{ selectedUserIds.size }}</strong> of
            <strong>{{ filteredUsers.length }}</strong> users assigned
            <span v-if="debouncedSearchQuery"> (filtered from {{ users.length }} total) </span>
          </span>
        </div>

        <!-- Users Table -->
        <v-data-table
          :headers="headers"
          :items="filteredUsers"
          :items-per-page="50"
          :items-per-page-options="[25, 50, 100, 200]"
          class="role-users-tab__table mt-4 elevation-1"
          density="comfortable"
        >
          <!-- Checkbox Column -->
          <template #item.selected="{ item }">
            <v-checkbox
              :model-value="isUserSelected(item.id)"
              hide-details
              density="compact"
              @update:model-value="toggleUser(item.id)"
            />
          </template>

          <!-- Login Column -->
          <template #item.login="{ item }">
            <div class="role-users-tab__login">
              <AtlasIcon
                size="small"
                class="mr-2"
              >
                mdi-account
              </AtlasIcon>
              <strong>{{ item.login }}</strong>
              <AtlasIcon
                v-if="hasUserChanged(item.id)"
                size="small"
                color="warning"
                class="ml-2"
              >
                mdi-circle-small
              </AtlasIcon>
            </div>
          </template>

          <!-- Name Column -->
          <template #item.name="{ item }">
            {{ item.name || item.displayName || '—' }}
          </template>

          <!-- Email Column -->
          <template #item.email="{ item }">
            <div
              v-if="item.email"
              class="role-users-tab__email"
            >
              <a :href="`mailto:${item.email}`">{{ item.email }}</a>
            </div>
            <span v-else> — </span>
          </template>
        </v-data-table>
      </template>

      <!-- Success Message -->
      <v-alert
        v-if="successMessage"
        type="success"
        variant="tonal"
        class="mt-4"
        closable
        @click:close="successMessage = null"
      >
        {{ successMessage }}
      </v-alert>

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
import { AtlasIcon, AtlasProgressCircular } from '@/components/ui'
import { ref, computed, onMounted, watch } from 'vue'
import { useRoles } from '@/composables/useRoles'

interface Props {
  roleId: number
}

const props = defineProps<Props>()

const {
  users,
  roleUsers,
  isLoadingUsers,
  usersError,
  fetchUsers,
  fetchRoleUsers,
  assignUserToRole,
  removeUserFromRole,
} = useRoles()

// Local state
const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const isSaving = ref(false)

// Debounce search input (300ms)
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, newValue => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    debouncedSearchQuery.value = newValue
  }, 300)
})
const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

// Track selected users (using Set for O(1) lookup)
const selectedUserIds = ref<Set<number>>(new Set())
const originalUserIds = ref<Set<number>>(new Set())

// Table headers
const headers = [
  { title: '', key: 'selected', sortable: false, width: '50px' },
  { title: 'Login', key: 'login', sortable: true },
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
]

/**
 * Filtered users based on debounced search
 */
const filteredUsers = computed(() => {
  if (!debouncedSearchQuery.value) {
    return users.value
  }

  const query = debouncedSearchQuery.value.toLowerCase().trim()
  return users.value.filter(u => {
    const login = u.login.toLowerCase()
    const name = (u.name || u.displayName || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    return login.includes(query) || name.includes(query) || email.includes(query)
  })
})

/**
 * Check if a user is selected
 */
function isUserSelected(userId: number): boolean {
  return selectedUserIds.value.has(userId)
}

/**
 * Check if a user's state has changed
 */
function hasUserChanged(userId: number): boolean {
  const wasSelected = originalUserIds.value.has(userId)
  const isSelected = selectedUserIds.value.has(userId)
  return wasSelected !== isSelected
}

/**
 * Toggle user selection
 */
function toggleUser(userId: number) {
  if (selectedUserIds.value.has(userId)) {
    selectedUserIds.value.delete(userId)
  } else {
    selectedUserIds.value.add(userId)
  }
  // Trigger reactivity
  selectedUserIds.value = new Set(selectedUserIds.value)
}

/**
 * Check if there are unsaved changes
 */
const hasChanges = computed(() => {
  if (selectedUserIds.value.size !== originalUserIds.value.size) {
    return true
  }

  for (const id of selectedUserIds.value) {
    if (!originalUserIds.value.has(id)) {
      return true
    }
  }

  return false
})

/**
 * Count of changes
 */
const changeCount = computed(() => {
  let count = 0

  // Count additions
  for (const id of selectedUserIds.value) {
    if (!originalUserIds.value.has(id)) {
      count++
    }
  }

  // Count removals
  for (const id of originalUserIds.value) {
    if (!selectedUserIds.value.has(id)) {
      count++
    }
  }

  return count
})

/**
 * Save user assignment changes
 */
async function handleSave() {
  if (!hasChanges.value) return

  isSaving.value = true
  successMessage.value = null
  errorMessage.value = null

  try {
    const toAdd: number[] = []
    const toRemove: number[] = []

    // Find users to add
    for (const id of selectedUserIds.value) {
      if (!originalUserIds.value.has(id)) {
        toAdd.push(id)
      }
    }

    // Find users to remove
    for (const id of originalUserIds.value) {
      if (!selectedUserIds.value.has(id)) {
        toRemove.push(id)
      }
    }

    // Execute additions
    for (const userId of toAdd) {
      const success = await assignUserToRole(props.roleId, userId)
      if (!success) {
        throw new Error(`Failed to assign user ${userId}`)
      }
    }

    // Execute removals
    for (const userId of toRemove) {
      const success = await removeUserFromRole(props.roleId, userId)
      if (!success) {
        throw new Error(`Failed to remove user ${userId}`)
      }
    }

    // Update original state
    originalUserIds.value = new Set(selectedUserIds.value)

    // Refresh role users
    await fetchRoleUsers(props.roleId)

    successMessage.value = `Successfully updated ${changeCount.value} user assignment${changeCount.value !== 1 ? 's' : ''}`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to save user assignments'
  } finally {
    isSaving.value = false
  }
}

/**
 * Load users and role users
 */
async function loadData() {
  // Load all users
  await fetchUsers()

  // Load role's current users
  await fetchRoleUsers(props.roleId)

  // Initialize selection state
  const roleUserIds = new Set(roleUsers.value.map(u => u.id))
  selectedUserIds.value = new Set(roleUserIds)
  originalUserIds.value = new Set(roleUserIds)
}

// Load data on mount
onMounted(() => {
  loadData()
})

// Reload when role changes
watch(
  () => props.roleId,
  () => {
    loadData()
  }
)
</script>

<style scoped>
.role-users-tab {
  border-radius: 4px;
}

.role-users-tab__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.role-users-tab__actions {
  display: flex;
  align-items: center;
}

.role-users-tab__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
}

.role-users-tab__summary {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: rgba(var(--v-theme-primary), 0.05);
  border-radius: 4px;
}

.role-users-tab__table {
  border-radius: 4px;
}

.role-users-tab__login {
  display: flex;
  align-items: center;
}

.role-users-tab__email a {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.role-users-tab__email a:hover {
  text-decoration: underline;
}
</style>
