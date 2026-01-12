<template>
  <div class="permissions-section">
    <!-- Role List View -->
    <div
      v-if="!selectedRoleId"
      class="permissions-section__list"
    >
      <!-- Header -->
      <div class="permissions-section__header">
        <v-text-field
          v-model="searchQuery"
          placeholder="Search roles..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="permissions-section__search"
        />
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-plus"
          @click="showCreateDialog = true"
        >
          New Role
        </v-btn>
      </div>

      <!-- Loading -->
      <v-progress-linear
        v-if="isLoadingRoles"
        indeterminate
        color="primary"
        class="my-4"
      />

      <!-- Error (hidden for 401 when not authenticated) -->
      <v-alert
        v-if="visibleError"
        type="error"
        variant="tonal"
        class="my-4"
        closable
      >
        {{ visibleError }}
      </v-alert>

      <!-- Empty State -->
      <div
        v-if="!isLoadingRoles && roles.length === 0"
        class="permissions-section__empty"
      >
        <v-icon
          size="64"
          color="grey-lighten-1"
        >
          mdi-shield-account-outline
        </v-icon>
        <p class="text-body-2 text-medium-emphasis mt-4">
          No roles found. Create your first role to get started.
        </p>
      </div>

      <!-- Role List -->
      <v-list
        v-else
        class="permissions-section__role-list"
      >
        <v-list-item
          v-for="role in filteredRoles"
          :key="role.id"
          :title="role.name"
          :subtitle="role.description || 'No description'"
          @click="selectRole(role.id)"
        >
          <template #prepend>
            <v-icon color="primary">
              mdi-shield-account
            </v-icon>
          </template>
          <template #append>
            <v-icon size="small">
              mdi-chevron-right
            </v-icon>
          </template>
        </v-list-item>
      </v-list>
    </div>

    <!-- Role Details View -->
    <div
      v-else
      class="permissions-section__details"
    >
      <!-- Back Button -->
      <v-btn
        variant="text"
        class="mb-4"
        @click="selectedRoleId = null"
      >
        <v-icon start>
          mdi-arrow-left
        </v-icon>
        Back to Roles
      </v-btn>

      <!-- Role Header -->
      <div class="permissions-section__role-header">
        <div>
          <h3 class="text-h6">
            {{ currentRole?.name }}
          </h3>
          <p class="text-body-2 text-medium-emphasis">
            {{ currentRole?.description || 'No description' }}
          </p>
        </div>
        <div class="permissions-section__role-actions">
          <v-btn
            icon
            variant="text"
            size="small"
            @click="handleEditRole"
          >
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <v-btn
            icon
            variant="text"
            size="small"
            color="error"
            @click="showDeleteDialog = true"
          >
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- Tabs for Users/Permissions -->
      <v-tabs
        v-model="detailsTab"
        class="mt-4"
      >
        <v-tab value="users">
          Users
        </v-tab>
        <v-tab value="permissions">
          Permissions
        </v-tab>
      </v-tabs>

      <v-window
        v-model="detailsTab"
        class="mt-4"
      >
        <v-window-item value="users">
          <RoleUsersTab :role-id="selectedRoleId" />
        </v-window-item>
        <v-window-item value="permissions">
          <RolePermissionsTab :role-id="selectedRoleId" />
        </v-window-item>
      </v-window>
    </div>

    <!-- Create/Edit Dialog -->
    <RoleCreateDialog
      v-model="showCreateDialog"
      :role="editingRole"
      @success="handleRoleSaved"
    />

    <!-- Delete Dialog -->
    <RoleDeleteDialog
      v-model="showDeleteDialog"
      :role="currentRole"
      @deleted="handleRoleDeleted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoles } from '@/composables/useRoles'
import { useAuth } from '@/composables/useAuth'
import type { Role } from '@/models/role.types'
import RolePermissionsTab from '@/components/config/permissions/RolePermissionsTab.vue'
import RoleUsersTab from '@/components/config/permissions/RoleUsersTab.vue'
import RoleCreateDialog from '@/components/config/permissions/RoleCreateDialog.vue'
import RoleDeleteDialog from '@/components/config/permissions/RoleDeleteDialog.vue'

const {
  roles,
  currentRole,
  isLoadingRoles,
  rolesError,
  fetchRoles,
  fetchRoleById,
} = useRoles()

const auth = useAuth()

// Only show errors if user is authenticated (suppress 401 errors when not logged in)
const visibleError = computed(() => {
  if (!rolesError.value) return null
  if (!auth.isAuthenticated.value && rolesError.value.includes('401')) return null
  return rolesError.value
})

const searchQuery = ref('')
const selectedRoleId = ref<number | null>(null)
const detailsTab = ref('users')
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const editingRole = ref<Role | null>(null)

const filteredRoles = computed(() => {
  if (!searchQuery.value) return roles.value
  const query = searchQuery.value.toLowerCase()
  return roles.value.filter(role =>
    role.name.toLowerCase().includes(query) ||
    role.description?.toLowerCase().includes(query)
  )
})

function selectRole(roleId: number) {
  selectedRoleId.value = roleId
  fetchRoleById(roleId)
}

function handleEditRole() {
  editingRole.value = currentRole.value
  showCreateDialog.value = true
}

function handleRoleSaved() {
  editingRole.value = null
  fetchRoles()
  if (selectedRoleId.value) {
    fetchRoleById(selectedRoleId.value)
  }
}

function handleRoleDeleted() {
  selectedRoleId.value = null
  fetchRoles()
}

watch(showCreateDialog, (isOpen) => {
  if (!isOpen) {
    editingRole.value = null
  }
})

onMounted(() => {
  fetchRoles()
})
</script>

<style scoped>
.permissions-section {
  min-height: 400px;
}

.permissions-section__header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.permissions-section__search {
  flex: 1;
  max-width: 300px;
}

.permissions-section__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
}

.permissions-section__role-list {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

.permissions-section__role-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
}

.permissions-section__role-actions {
  display: flex;
  gap: 4px;
}
</style>
