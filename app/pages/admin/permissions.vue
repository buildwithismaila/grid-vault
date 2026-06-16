<script setup lang="ts">
import type { PermissionRow, RoleRow } from '#shared/types/admin'

definePageMeta({
  middleware: async () => {
    const { isSuperadmin } = useAuthorization()
    if (!isSuperadmin())
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  },
})

const toast = useToast()

const { data: permissions, status: permsStatus, refresh: refreshPerms } = useLazyFetch('/api/rbac/permissions', { server: false })
const { data: roles, status: rolesStatus, refresh: refreshRoles } = useLazyFetch('/api/rbac/roles', { server: false })

const loading = computed(() => permsStatus.value === 'pending' || permsStatus.value === 'idle' || rolesStatus.value === 'pending' || rolesStatus.value === 'idle')

const seeding = ref(false)
const refreshing = ref(false)
const hideSystem = ref(false)

const visibleRoles = computed(() => {
  const allRoles = (roles.value ?? []) as RoleRow[]
  return hideSystem.value ? allRoles.filter(r => !r.isSystem) : allRoles
})

const dirtyRolesSet = reactive(new Set<string>())

const rolePerms = ref<Record<string, string[]>>({})

watch(roles, (val) => {
  rolePerms.value = {}
  if (!val)
    return
  for (const r of val as RoleRow[])
    rolePerms.value[r.id] = [...r.permissionIds]
})

function getEffectivePerms(roleId: string, originals: string[]) {
  return rolePerms.value[roleId] ?? originals
}

function togglePerm(roleId: string, permissionId: string, currentlyAssigned: boolean) {
  const perms = rolePerms.value[roleId]
  if (!perms)
    return
  if (currentlyAssigned) {
    perms.splice(perms.indexOf(permissionId), 1)
  }
  else {
    perms.push(permissionId)
  }
  dirtyRolesSet.add(roleId)
  rolePerms.value = { ...rolePerms.value }
}

const savingAll = ref(false)

async function saveAllChanges() {
  if (dirtyRolesSet.size === 0)
    return
  savingAll.value = true
  try {
    await Promise.all([...dirtyRolesSet].map(async (roleId) => {
      await $fetch(`/api/rbac/roles/${roleId}/permissions` as const, {
        method: 'PUT',
        body: { permissionIds: rolePerms.value[roleId] },
      })
    }))
    toast.add({
      title: 'Permissions saved',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    dirtyRolesSet.clear()
    await refreshRoles()
  }
  catch (err: any) {
    toast.add({
      title: err.data?.statusMessage || 'Failed to save permissions',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    await refreshRoles()
  }
  finally {
    savingAll.value = false
  }
}

function discardChanges() {
  dirtyRolesSet.clear()
  rolePerms.value = {}
  if (roles.value) {
    for (const r of roles.value as RoleRow[])
      rolePerms.value[r.id] = [...r.permissionIds]
  }
}

async function seedRbac() {
  seeding.value = true
  try {
    await $fetch('/api/rbac/seed', { method: 'POST' })
    toast.add({ title: 'RBAC seeded successfully', color: 'success', icon: 'i-lucide-check-circle' })
    await Promise.all([refreshPerms(), refreshRoles()])
  }
  catch (err: any) {
    toast.add({ title: err.data?.statusMessage || 'Failed to seed RBAC', color: 'error', icon: 'i-lucide-alert-circle' })
  }
  finally {
    seeding.value = false
  }
}

async function refresh() {
  refreshing.value = true
  await Promise.all([refreshPerms(), refreshRoles()])
  refreshing.value = false
}

const groupedPermissions = computed(() => {
  if (!permissions.value)
    return {}
  const groups: Record<string, PermissionRow[]> = {}
  for (const p of permissions.value as PermissionRow[]) {
    (groups[p.resource] ??= []).push(p)
  }
  return groups
})

const expandedResources = reactive(new Set<string>())

function toggleExpandResource(res: string) {
  if (expandedResources.has(res))
    expandedResources.delete(res)
  else
    expandedResources.add(res)
}

const resourceLabels: Record<string, string> = {
  user: 'Users',
  org_unit: 'Organisation Units',
  job_role: 'Job Roles',
  inventory: 'Inventory',
  asset: 'Assets',
  report: 'Reports',
}

const actionLabels: Record<string, string> = {
  create: 'Create',
  read: 'Read',
  update: 'Update',
  delete: 'Delete',
}

const sectionOrder = ['system', 'domain'] as const

const sectionMeta: Record<string, { label: string, icon: string, resources: readonly string[] }> = {
  system: { label: 'System Resources', icon: 'i-lucide-shield', resources: ['user', 'org_unit', 'job_role'] },
  domain: { label: 'Domain Resources', icon: 'i-lucide-blocks', resources: ['inventory', 'asset', 'report'] },
}
</script>

<template>
  <div>
    <div class="p-6 pb-0">
      <div class="mb-6">
        <h2 class="text-lg font-semibold text-default">
          Permission Matrix
        </h2>
        <p class="text-sm text-muted mt-1">
          Toggle permissions on or off for each custom role. System roles are read-only.
          Changes are saved in batch — click "Save changes" when done.
        </p>
      </div>

      <div v-if="!roles?.length && !permissions?.length" class="flex flex-col items-center gap-4 py-16">
        <UIcon name="i-lucide-shield" class="size-10 text-muted" />
        <div class="text-center">
          <p class="text-sm font-medium">
            No permissions or roles found
          </p>
          <p class="text-xs text-muted mt-1">
            Seed the RBAC system to create default permissions and system roles
          </p>
        </div>
        <UButton icon="i-lucide-database" label="Seed RBAC" :loading="seeding" @click="seedRbac" />
      </div>

      <div v-else-if="!visibleRoles.length" class="flex flex-col items-center gap-4 py-16">
        <UIcon name="i-lucide-eye-off" class="size-10 text-muted" />
        <div class="text-center">
          <p class="text-sm font-medium">
            No custom roles to display
          </p>
          <p class="text-xs text-muted mt-1">
            All roles are system roles. Toggle "Show system roles" above to see them, or create custom roles in the Roles page
          </p>
        </div>
        <UButton icon="i-lucide-plus" label="Create role" to="/admin/roles" />
      </div>

      <div v-else>
        <div class="flex items-center justify-between px-4 py-3 border-b border-accented">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <USwitch v-model="hideSystem" size="sm" />
              <span class="text-sm text-muted">Hide system roles</span>
            </div>
          </div>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            :loading="refreshing"
            @click="refresh"
          />
        </div>
        <div class="overflow-x-auto relative">
          <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-lg">
            <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
          </div>
          <table class="w-full min-w-[640px]">
            <thead>
              <tr class="border-b border-default">
                <th class="text-left py-3 pr-4 text-sm font-medium text-muted w-44">
                  Permission
                </th>
                <th class="text-left py-3 pr-4 text-sm font-medium text-muted">
                  Description
                </th>
                <th
                  v-for="r in visibleRoles"
                  :key="r.id"
                  class="text-center py-3 px-3 text-sm font-medium text-muted w-28"
                >
                  <div class="flex flex-col items-center gap-0.5">
                    <span class="truncate max-w-24" :title="r.name" :class="dirtyRolesSet.has(r.id) ? 'font-bold' : ''">{{ r.name }}</span>
                    <div class="flex items-center gap-1">
                      <UBadge v-if="r.isSystem" label="system" color="neutral" variant="subtle" size="sm" />
                      <div v-else-if="dirtyRolesSet.has(r.id)" class="size-1.5 rounded-full bg-warning" />
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="sectionKey in sectionOrder" :key="sectionKey">
                <tr class="bg-elevated/30">
                  <td colspan="2" class="py-2 px-3">
                    <div class="flex items-center gap-2">
                      <UIcon :name="sectionMeta[sectionKey]!.icon" class="size-3.5 text-muted" />
                      <span class="text-xs font-semibold uppercase tracking-wider text-muted">{{ sectionMeta[sectionKey]!.label }}</span>
                    </div>
                  </td>
                  <td
                    v-for="r in visibleRoles"
                    :key="r.id"
                    class="text-center py-2 px-3"
                  >
                    <span class="text-xs text-muted">
                      {{ sectionMeta[sectionKey]!.resources.reduce((sum, res) => {
                        const perms = (groupedPermissions[res] || [])
                        return sum + (getEffectivePerms(r.id, r.permissionIds).filter(pid => perms.some((p: PermissionRow) => p.id === pid)).length)
                      }, 0) }}/{{ sectionMeta[sectionKey]!.resources.length * 4 }}
                    </span>
                  </td>
                </tr>
                <template v-for="res in sectionMeta[sectionKey]!.resources" :key="res">
                  <tr
                    class="cursor-pointer hover:bg-elevated/30 border-b border-default/50 transition-colors"
                    @click="toggleExpandResource(res)"
                  >
                    <td colspan="2" class="py-2.5 px-3">
                      <div class="flex items-center gap-2">
                        <UIcon
                          :name="expandedResources.has(res) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                          class="size-4 text-muted shrink-0"
                        />
                        <span class="text-sm font-medium">{{ resourceLabels[res] || res }}</span>
                      </div>
                    </td>
                    <td
                      v-for="r in visibleRoles"
                      :key="r.id"
                      class="text-center py-2.5 px-3"
                    >
                      <span class="text-sm font-medium tabular-nums">
                        {{ getEffectivePerms(r.id, r.permissionIds).filter(pid => (groupedPermissions[res] || []).some((p: PermissionRow) => p.id === pid)).length }}/4
                      </span>
                    </td>
                  </tr>
                  <template v-if="expandedResources.has(res)">
                    <tr
                      v-for="p in (groupedPermissions[res] || [])"
                      :key="p.id"
                      class="border-b border-default/50 hover:bg-elevated/50 transition-colors"
                    >
                      <td class="py-2.5 pr-4 text-sm pl-8">
                        {{ actionLabels[p.action] || p.action }}
                      </td>
                      <td class="py-2.5 pr-4">
                        <span class="text-xs text-muted">{{ p.description || '' }}</span>
                      </td>
                      <td
                        v-for="r in visibleRoles"
                        :key="r.id"
                        class="py-2.5 px-3"
                      >
                        <div class="flex items-center justify-center min-h-[28px]">
                          <USwitch
                            v-if="!r.isSystem"
                            :model-value="getEffectivePerms(r.id, r.permissionIds).includes(p.id)"
                            @update:model-value="(v: boolean) => togglePerm(r.id, p.id, getEffectivePerms(r.id, r.permissionIds).includes(p.id))"
                          />
                          <UIcon
                            v-else
                            :name="r.permissionIds.includes(p.id) ? 'i-lucide-check' : 'i-lucide-minus'"
                            class="size-4"
                            :class="r.permissionIds.includes(p.id) ? 'text-success' : 'text-muted'"
                          />
                        </div>
                      </td>
                    </tr>
                  </template>
                </template>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div
      v-if="dirtyRolesSet.size > 0"
      class="sticky bottom-0 left-0 right-0 bg-elevated border-t border-accented px-6 py-3 flex items-center justify-between"
    >
      <span class="text-sm text-muted">
        {{ dirtyRolesSet.size }} role{{ dirtyRolesSet.size !== 1 ? 's' : '' }} with unsaved changes
      </span>
      <div class="flex gap-3">
        <UButton
          label="Discard"
          color="neutral"
          variant="outline"
          size="sm"
          @click="discardChanges"
        />
        <UButton
          label="Save changes"
          color="primary"
          size="sm"
          :loading="savingAll"
          @click="saveAllChanges"
        />
      </div>
    </div>
  </div>
</template>
