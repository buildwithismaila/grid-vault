<script setup lang="ts">
const { user } = useUserSession()
const { can } = useAuthorization()
const { data: users } = useLazyFetch('/api/admin/users', { server: false })

const activeCount = computed(() => (users.value || []).filter((u: any) => u.status === 'ACTIVE').length)
const inactiveCount = computed(() => (users.value || []).filter((u: any) => u.status === 'INACTIVE').length)
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-8">
        <div>
          <h1 class="text-2xl font-semibold text-default">
            Welcome back, {{ user?.name || 'User' }}
          </h1>
          <p class="text-muted mt-1">
            {{ user?.email }}
          </p>
        </div>

        <div v-if="can('user:read')" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <UCard variant="subtle" class="relative overflow-hidden">
            <div class="flex items-center gap-4">
              <div class="shrink-0 rounded-full bg-success/10 p-3">
                <UIcon name="i-lucide-users" class="size-6 text-success" />
              </div>
              <div>
                <p class="text-2xl font-bold">
                  {{ users?.length || 0 }}
                </p>
                <p class="text-sm text-muted">
                  Total users
                </p>
              </div>
            </div>
          </UCard>

          <UCard variant="subtle" class="relative overflow-hidden">
            <div class="flex items-center gap-4">
              <div class="shrink-0 rounded-full bg-success/10 p-3">
                <UIcon name="i-lucide-check-circle" class="size-6 text-success" />
              </div>
              <div>
                <p class="text-2xl font-bold">
                  {{ activeCount }}
                </p>
                <p class="text-sm text-muted">
                  Active
                </p>
              </div>
            </div>
          </UCard>

          <UCard variant="subtle" class="relative overflow-hidden">
            <div class="flex items-center gap-4">
              <div class="shrink-0 rounded-full bg-warning/10 p-3">
                <UIcon name="i-lucide-pause" class="size-6 text-warning" />
              </div>
              <div>
                <p class="text-2xl font-bold">
                  {{ inactiveCount }}
                </p>
                <p class="text-sm text-muted">
                  Inactive
                </p>
              </div>
            </div>
          </UCard>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <UCard v-if="can('user:read')" to="/admin/users">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-users" class="size-5 text-primary" />
                <span class="font-semibold">Users</span>
              </div>
            </template>
            <p class="text-sm text-muted">
              Manage users, invitations, and role assignments
            </p>
          </UCard>

          <UCard v-if="can('user:read')" to="/admin/roles">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-key-round" class="size-5 text-primary" />
                <span class="font-semibold">Roles</span>
              </div>
            </template>
            <p class="text-sm text-muted">
              Define custom roles and configure permissions
            </p>
          </UCard>

          <UCard v-if="can('org_unit:read')" to="/admin/org-units">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-building" class="size-5 text-primary" />
                <span class="font-semibold">Org Units</span>
              </div>
            </template>
            <p class="text-sm text-muted">
              Manage organisational structure
            </p>
          </UCard>

          <UCard v-if="can('job_role:read')" to="/admin/job-roles">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-briefcase" class="size-5 text-primary" />
                <span class="font-semibold">Job Roles</span>
              </div>
            </template>
            <p class="text-sm text-muted">
              Manage job roles and responsibilities
            </p>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
