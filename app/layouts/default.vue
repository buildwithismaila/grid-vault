<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const { can } = useAuthorization()

const mainLinks = computed<NavigationMenuItem[]>(() => {
  const items: NavigationMenuItem[] = [
    { label: 'Dashboard', icon: 'i-lucide-house', to: '/' },
  ]

  if (can('user:read')) {
    items.push({
      label: 'Administration',
      icon: 'i-lucide-shield',
      type: 'trigger',
      defaultOpen: route.path.startsWith('/admin'),
      children: [
        { label: 'Users', icon: 'i-lucide-users', to: '/admin/users' },
        { label: 'Roles', icon: 'i-lucide-key-round', to: '/admin/roles' },
        { label: 'Permissions', icon: 'i-lucide-shield-check', to: '/admin/permissions' },
        { label: 'Org Units', icon: 'i-lucide-building', to: '/admin/org-units' },
        { label: 'Job Roles', icon: 'i-lucide-briefcase', to: '/admin/job-roles' },
      ],
    })
  }

  items.push({
    label: 'Settings',
    icon: 'i-lucide-settings',
    type: 'trigger',
    defaultOpen: route.path.startsWith('/settings'),
    children: [
      { label: 'General', icon: 'i-lucide-user', to: '/settings', exact: true },
      { label: 'Security', icon: 'i-lucide-shield', to: '/settings/security' },
    ],
  })

  return items
})

const searchGroups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: mainLinks.value.flat(),
}])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <UButton
          :label="collapsed ? undefined : 'Grid Vault'"
          color="neutral"
          variant="ghost"
          block
          :square="collapsed"
          class="data-[state=open]:bg-elevated"
          :class="[!collapsed && 'py-2']"
        />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="mainLinks"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="searchGroups" />

    <slot />
  </UDashboardGroup>
</template>
