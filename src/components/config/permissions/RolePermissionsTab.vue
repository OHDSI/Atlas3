<template>
  <v-card class="role-permissions-tab">
    <v-card-text>
      <!-- Header with Search and Save Button -->
      <div class="role-permissions-tab__header">
        <AtlasTextField
          v-model="searchQuery"
          placeholder="Search permissions..."
          prepend-icon="mdi-magnify"
          variant="outlined"
          hide-details
          clearable
          class="role-permissions-tab__search"
          style="max-width: 400px"
        />

        <div class="role-permissions-tab__actions">
          <AtlasChip
            v-if="hasChanges"
            tone="warning"
            size="sm"
            class="mr-2"
          >
            {{ changeCount }} change{{ changeCount !== 1 ? 's' : '' }}
          </AtlasChip>

          <AtlasButton
            :disabled="!hasChanges || isSaving"
            :loading="isSaving"
            @click="handleSave"
          >
            Save Changes
          </AtlasButton>
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="isLoadingPermissions"
        class="role-permissions-tab__loading"
      >
        <AtlasProgressCircular
          indeterminate
          color="primary"
          size="64"
        />
        <p class="text-body-1 mt-4">
          Loading permissions...
        </p>
      </div>

      <!-- Error State -->
      <AtlasAlert
        v-else-if="permissionsError"
        severity="danger"
        class="mt-4"
        :closable="true"
        @close="permissionsError = null"
      >
        {{ permissionsError }}
      </AtlasAlert>

      <!-- Permissions List -->
      <template v-else>
        <!-- Summary -->
        <div class="role-permissions-tab__summary mt-4">
          <AtlasIcon
            size="small"
            class="mr-2"
          >
            mdi-shield-check
          </AtlasIcon>
          <span class="text-body-2">
            <strong>{{ selectedPermissionIds.size }}</strong> of
            <strong>{{ filteredPermissions.length }}</strong> permissions assigned
            <span v-if="debouncedSearchQuery">
              (filtered from {{ permissions.length }} total)
            </span>
          </span>
        </div>

        <!-- Category Filter (if categories available) -->
        <div
          v-if="availableCategories.length > 0"
          class="role-permissions-tab__category-filter mt-4"
        >
          <v-chip-group
            v-model="selectedCategory"
            mandatory
            class="role-permissions-tab__chips"
          >
            <AtlasChip
              value="all"
              filter
              variant="outlined"
            >
              All Categories
            </AtlasChip>
            <AtlasChip
              v-for="category in availableCategories"
              :key="category"
              :value="category"
              filter
              variant="outlined"
            >
              {{ category }} ({{ getCategoryCount(category) }})
            </AtlasChip>
          </v-chip-group>
        </div>

        <!-- Permissions Table -->
        <AtlasDataTable
          :headers="headers"
          :items="filteredPermissions"
          :items-per-page="50"
          :items-per-page-options="[25, 50, 100, 200]"
          class="role-permissions-tab__table mt-4 elevation-1"
        >
          <!-- Checkbox Column -->
          <template #item.selected="{ item }">
            <AtlasCheckbox
              :model-value="isPermissionSelected(item.id)"
              hide-details
              @update:model-value="togglePermission(item.id)"
            />
          </template>

          <!-- Permission String Column -->
          <template #item.permission="{ item }">
            <div class="role-permissions-tab__permission">
              <code class="role-permissions-tab__permission-code">
                {{ getPermissionString(item) }}
              </code>
              <AtlasIcon
                v-if="hasPermissionChanged(item.id)"
                size="small"
                color="warning"
                class="ml-2"
              >
                mdi-circle-small
              </AtlasIcon>
            </div>
          </template>

          <!-- Description Column with Tooltip -->
          <template #item.description="{ item }">
            <div class="role-permissions-tab__description">
              <span>{{ item.description || '—' }}</span>
              <AtlasTooltip
                v-if="item.description"
                activator="parent"
                location="top"
              >
                {{ item.description }}
              </AtlasTooltip>
            </div>
          </template>

          <!-- Category Column -->
          <template #item.category="{ item }">
            <AtlasChip
              v-if="item.category"
              size="sm"
              variant="outlined"
            >
              {{ item.category }}
            </AtlasChip>
            <span v-else> — </span>
          </template>
        </AtlasDataTable>
      </template>

      <!-- Success Message -->
      <AtlasAlert
        v-if="successMessage"
        severity="success"
        class="mt-4"
        :closable="true"
        @close="successMessage = null"
      >
        {{ successMessage }}
      </AtlasAlert>

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
import { AtlasAlert, AtlasButton, AtlasCheckbox, AtlasChip, AtlasDataTable, AtlasIcon, AtlasProgressCircular, AtlasTextField, AtlasTooltip } from '@/components/ui'
import { ref, computed, onMounted, watch } from 'vue'
import { useRoles } from '@/composables/useRoles'
import type { Permission } from '@/models/role.types'

interface Props {
  roleId: number
}

const props = defineProps<Props>()

const {
  permissions,
  rolePermissions,
  isLoadingPermissions,
  permissionsError,
  fetchPermissions,
  fetchRolePermissions,
  assignPermissionToRole,
  removePermissionFromRole,
} = useRoles()

// Local state
const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const selectedCategory = ref<string>('all')

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
const isSaving = ref(false)
const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

// Track selected permissions (using Set for O(1) lookup)
const selectedPermissionIds = ref<Set<number>>(new Set())
const originalPermissionIds = ref<Set<number>>(new Set())

// Table headers
const headers = [
  { title: '', key: 'selected', sortable: false, width: '50px' },
  { title: 'Permission', key: 'permission', sortable: true },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Category', key: 'category', sortable: true },
]

/**
 * Get permission string (handle both 'permission' and 'value' fields)
 */
function getPermissionString(permission: Permission): string {
  return permission.permission || permission.value || ''
}

/**
 * Available categories from permissions
 */
const availableCategories = computed(() => {
  const categories = new Set<string>()
  permissions.value.forEach(p => {
    if (p.category) {
      categories.add(p.category)
    }
  })
  return Array.from(categories).sort()
})

/**
 * Get count of permissions in a category
 */
function getCategoryCount(category: string): number {
  return permissions.value.filter(p => p.category === category).length
}

/**
 * Filtered permissions based on search and category
 */
const filteredPermissions = computed(() => {
  let filtered = permissions.value

  // Filter by category
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(p => p.category === selectedCategory.value)
  }

  // Filter by debounced search query
  if (debouncedSearchQuery.value) {
    const query = debouncedSearchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(p => {
      const permissionString = getPermissionString(p).toLowerCase()
      const description = (p.description || '').toLowerCase()
      return permissionString.includes(query) || description.includes(query)
    })
  }

  return filtered
})

/**
 * Check if a permission is selected
 */
function isPermissionSelected(permissionId: number): boolean {
  return selectedPermissionIds.value.has(permissionId)
}

/**
 * Check if a permission's state has changed
 */
function hasPermissionChanged(permissionId: number): boolean {
  const wasSelected = originalPermissionIds.value.has(permissionId)
  const isSelected = selectedPermissionIds.value.has(permissionId)
  return wasSelected !== isSelected
}

/**
 * Toggle permission selection
 */
function togglePermission(permissionId: number) {
  if (selectedPermissionIds.value.has(permissionId)) {
    selectedPermissionIds.value.delete(permissionId)
  } else {
    selectedPermissionIds.value.add(permissionId)
  }
  // Trigger reactivity
  selectedPermissionIds.value = new Set(selectedPermissionIds.value)
}

/**
 * Check if there are unsaved changes
 */
const hasChanges = computed(() => {
  if (selectedPermissionIds.value.size !== originalPermissionIds.value.size) {
    return true
  }

  for (const id of selectedPermissionIds.value) {
    if (!originalPermissionIds.value.has(id)) {
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
  for (const id of selectedPermissionIds.value) {
    if (!originalPermissionIds.value.has(id)) {
      count++
    }
  }

  // Count removals
  for (const id of originalPermissionIds.value) {
    if (!selectedPermissionIds.value.has(id)) {
      count++
    }
  }

  return count
})

/**
 * Save permission changes
 */
async function handleSave() {
  if (!hasChanges.value) return

  isSaving.value = true
  successMessage.value = null
  errorMessage.value = null

  try {
    const toAdd: number[] = []
    const toRemove: number[] = []

    // Find permissions to add
    for (const id of selectedPermissionIds.value) {
      if (!originalPermissionIds.value.has(id)) {
        toAdd.push(id)
      }
    }

    // Find permissions to remove
    for (const id of originalPermissionIds.value) {
      if (!selectedPermissionIds.value.has(id)) {
        toRemove.push(id)
      }
    }

    // Execute additions
    for (const permissionId of toAdd) {
      const success = await assignPermissionToRole(props.roleId, permissionId)
      if (!success) {
        throw new Error(`Failed to assign permission ${permissionId}`)
      }
    }

    // Execute removals
    for (const permissionId of toRemove) {
      const success = await removePermissionFromRole(props.roleId, permissionId)
      if (!success) {
        throw new Error(`Failed to remove permission ${permissionId}`)
      }
    }

    // Update original state
    originalPermissionIds.value = new Set(selectedPermissionIds.value)

    // Refresh role permissions
    await fetchRolePermissions(props.roleId)

    successMessage.value = `Successfully updated ${changeCount.value} permission${changeCount.value !== 1 ? 's' : ''}`
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to save permission changes'
  } finally {
    isSaving.value = false
  }
}

/**
 * Load permissions and role permissions
 */
async function loadData() {
  // Load all permissions
  await fetchPermissions()

  // Load role's current permissions
  await fetchRolePermissions(props.roleId)

  // Initialize selection state
  const rolePermIds = new Set(rolePermissions.value.map(p => p.id))
  selectedPermissionIds.value = new Set(rolePermIds)
  originalPermissionIds.value = new Set(rolePermIds)
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
.role-permissions-tab {
  border-radius: 4px;
}

.role-permissions-tab__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.role-permissions-tab__actions {
  display: flex;
  align-items: center;
}

.role-permissions-tab__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
}

.role-permissions-tab__summary {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: rgba(var(--v-theme-primary), 0.05);
  border-radius: 4px;
}

.role-permissions-tab__category-filter {
  padding: 12px 0;
}

.role-permissions-tab__chips {
  margin: 0;
}

.role-permissions-tab__table {
  border-radius: 4px;
}

.role-permissions-tab__permission {
  display: flex;
  align-items: center;
}

.role-permissions-tab__permission-code {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 3px;
}

.role-permissions-tab__description {
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
