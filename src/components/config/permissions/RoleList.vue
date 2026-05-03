<template>
  <div class="role-list">
    <!-- Header with Search and New Role Button -->
    <div class="role-list__header">
      <div class="role-list__header-left">
        <h2 class="text-h5">
          Roles
        </h2>
        <AtlasTextField
          v-model="searchQuery"
          placeholder="Search roles..."
          prepend-icon="mdi-magnify"
          variant="outlined"
          hide-details
          clearable
          class="role-list__search"
          style="max-width: 400px"
        />
      </div>
      <v-btn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-plus"
        @click="handleCreate"
      >
        New Role
      </v-btn>
    </div>

    <!-- Loading State -->
    <AtlasProgressLinear
      v-if="isLoadingRoles"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <!-- Error State -->
    <AtlasAlert
      v-if="rolesError"
      severity="danger"
      class="mb-4"
      :closable="true"
      @close="rolesError = null"
    >
      {{ rolesError }}
    </AtlasAlert>

    <!-- Empty State -->
    <div
      v-if="!isLoadingRoles && roles.length === 0"
      class="role-list__empty"
    >
      <AtlasIcon
        size="80"
        color="grey-lighten-1"
      >
        mdi-shield-account-outline
      </AtlasIcon>
      <h3 class="text-h6 mt-4">
        No roles found
      </h3>
      <p class="text-body-2 text-medium-emphasis mt-2">
        Create your first role to get started with role-based access control.
      </p>
      <v-btn
        color="primary"
        variant="elevated"
        size="large"
        class="mt-4"
        prepend-icon="mdi-plus"
        @click="handleCreate"
      >
        Create First Role
      </v-btn>
    </div>

    <!-- Roles Data Table -->
    <AtlasDataTable
      v-else
      :headers="headers"
      :items="filteredRoles"
      :loading="isLoadingRoles"
      :items-per-page="50"
      :items-per-page-options="[50, 100, 200]"
      class="role-list__table elevation-1"
      hover
      @click:row="handleRowClick"
    >
      <!-- Name Column -->
      <template #item.name="{ item }">
        <div class="role-list__name">
          <AtlasIcon
            size="small"
            class="mr-2"
            color="primary"
          >
            mdi-shield-account
          </AtlasIcon>
          <strong>{{ item.name }}</strong>
        </div>
      </template>

      <!-- Description Column -->
      <template #item.description="{ item }">
        <div
          class="text-truncate"
          style="max-width: 400px"
        >
          {{ item.description || '—' }}
        </div>
      </template>

      <!-- Created Date Column -->
      <template #item.createdDate="{ item }">
        {{ formatDate(item.createdDate) }}
      </template>

      <!-- Modified Date Column -->
      <template #item.modifiedDate="{ item }">
        {{ formatDate(item.modifiedDate) }}
      </template>

      <!-- Actions Column -->
      <template #item.actions="{ item }">
        <div class="role-list__actions">
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            @click.stop="handleEdit(item)"
          >
            <AtlasIcon size="small">
              mdi-pencil
            </AtlasIcon>
            <AtlasTooltip activator="parent">
              Edit Role
            </AtlasTooltip>
          </v-btn>

          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            @click.stop="handleDelete(item)"
          >
            <AtlasIcon size="small">
              mdi-delete
            </AtlasIcon>
            <AtlasTooltip activator="parent">
              Delete Role
            </AtlasTooltip>
          </v-btn>
        </div>
      </template>

      <!-- Loading State -->
      <template #loading>
        <AtlasSkeleton type="table-row@5" />
      </template>

      <!-- Footer with item count -->
      <template #bottom>
        <div class="role-list__footer">
          <div class="text-caption text-medium-emphasis pa-4">
            <span v-if="debouncedSearchQuery">
              {{ filteredRoles.length }} of {{ roles.length }} roles
            </span>
            <span v-else> {{ roles.length }} role{{ roles.length !== 1 ? 's' : '' }} total </span>
          </div>
        </div>
      </template>
    </AtlasDataTable>

    <!-- Create/Edit Dialog -->
    <role-create-dialog
      v-model="createDialogOpen"
      :role="selectedRole"
      @success="handleCreateSuccess"
    />

    <!-- Delete Confirmation Dialog -->
    <role-delete-dialog
      v-model="deleteDialogOpen"
      :role="selectedRole"
      :user-count="selectedRoleUserCount"
      @success="handleDeleteSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasDataTable, AtlasIcon, AtlasProgressLinear, AtlasSkeleton, AtlasTextField, AtlasTooltip } from '@/components/ui'
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRoles } from '@/composables/useRoles'
import type { Role } from '@/models/role.types'
import RoleCreateDialog from './RoleCreateDialog.vue'
import RoleDeleteDialog from './RoleDeleteDialog.vue'

const router = useRouter()
const { roles, isLoadingRoles, rolesError, fetchRoles, fetchRoleUsers, roleUsers } = useRoles()

// Search state with debouncing
const searchQuery = ref('')
const debouncedSearchQuery = ref('')

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

// Dialog state
const createDialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const selectedRole = ref<Role | null>(null)
const selectedRoleUserCount = ref(0)

// Filtered roles based on debounced search query
const filteredRoles = computed(() => {
  if (!debouncedSearchQuery.value) {
    return roles.value
  }

  const query = debouncedSearchQuery.value.toLowerCase().trim()
  return roles.value.filter(role => {
    const nameMatch = role.name.toLowerCase().includes(query)
    const descriptionMatch = role.description?.toLowerCase().includes(query) || false
    return nameMatch || descriptionMatch
  })
})

// Table configuration
const headers = [
  { title: 'Role Name', key: 'name', sortable: true },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Created', key: 'createdDate', sortable: true },
  { title: 'Modified', key: 'modifiedDate', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
]

// Load roles on mount
onMounted(async () => {
  await fetchRoles()
})

/**
 * Format date for display
 */
function formatDate(dateString?: string | null): string {
  if (!dateString) return '—'

  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  } catch {
    return '—'
  }
}

/**
 * Handle row click - navigate to role details
 */
function handleRowClick(_event: Event, row: { item: Role }) {
  router.push({
    name: 'role-details',
    params: { id: row.item.id },
  })
}

/**
 * Open create dialog
 */
function handleCreate() {
  selectedRole.value = null
  createDialogOpen.value = true
}

/**
 * Open edit dialog
 */
function handleEdit(role: Role) {
  selectedRole.value = role
  createDialogOpen.value = true
}

/**
 * Open delete dialog
 * FR-005: Fetch user count before showing delete confirmation
 */
async function handleDelete(role: Role) {
  selectedRole.value = role

  // Fetch users assigned to this role to show count in confirmation
  await fetchRoleUsers(role.id)
  selectedRoleUserCount.value = roleUsers.value.length

  deleteDialogOpen.value = true
}

/**
 * Handle successful role create/update
 */
function handleCreateSuccess(_role: Role) {
  // Refresh roles list
  fetchRoles()
}

/**
 * Handle successful role deletion
 */
function handleDeleteSuccess() {
  selectedRole.value = null
  selectedRoleUserCount.value = 0
  // Roles list is already updated by the store
}
</script>

<style scoped>
.role-list {
  width: 100%;
}

.role-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.role-list__header-left {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
}

.role-list__search {
  margin-left: 24px;
}

.role-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.role-list__table {
  border-radius: 4px;
}

.role-list__name {
  display: flex;
  align-items: center;
}

.role-list__actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.role-list__footer {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* Make table rows clickable */
:deep(.v-data-table__tr) {
  cursor: pointer;
}

:deep(.v-data-table__tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.04);
}
</style>
