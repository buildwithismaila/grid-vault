<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const links = [[{
  label: 'Users',
  icon: 'i-lucide-user',
  to: '/admin/users',
  exact: true,
}, {
  label: 'Roles',
  icon: 'i-lucide-shield',
  to: '/admin/roles',
}, {
  label: 'Permissions',
  icon: 'i-lucide-shield',
  to: '/admin/permissions',
}, {
  label: 'Organization',
  icon: 'i-lucide-building',
  to: '/admin/org-units',
}, {
  label: 'Job Roles',
  icon: 'i-lucide-briefcase',
  to: '/admin/job-roles',
}]] satisfies NavigationMenuItem[][]
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar title="Administration">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <!-- NOTE: The `-mx-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col w-full ">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
