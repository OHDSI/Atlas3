<template>
  <div class="page-wrapper">
    <div class="page-card">
      <AtlasContainer
        fluid
        class="role-management-view"
      >
        <AtlasRow>
          <AtlasCol cols="12">
            <!-- Page Header -->
            <div class="role-management-view__header">
              <div>
                <h1 class="text-h4 mb-2">
                  Role &amp; Permissions Management
                </h1>
                <p class="text-body-2 text-medium-emphasis">
                  Manage user roles, assign permissions, and control access to system features.
                </p>
              </div>
            </div>
          </AtlasCol>
        </AtlasRow>

        <AtlasRow>
          <AtlasCol cols="12">
            <!-- Role List Component -->
            <role-list />
          </AtlasCol>
        </AtlasRow>
      </AtlasContainer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasCol, AtlasContainer, AtlasRow } from '@/components/ui'
import RoleList from '@/components/config/permissions/RoleList.vue'
</script>

<style scoped>
.role-management-view {
  padding: 24px;
}

.role-management-view__header {
  margin-bottom: 32px;
}
</style>
