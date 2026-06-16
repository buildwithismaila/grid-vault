<script setup lang="ts">
import type { PermissionRow, RoleRow } from '#shared/types/admin'
import { ACTIONS } from '#shared/utils/permissions'
import type { TableColumn } from '@nuxt/ui'

const { isSuperadmin } = useAuthorization()
const { onError, toast } = useToastError()

const search = ref('')
const createOpen = ref(false)
const editOpen = ref(false)
const deleteOpen = ref(false)

const selectedRole = ref<RoleRow | null>(null)
const roleToDelete = ref<RoleRow | null>(null)

const roleName = ref('')
const roleDescription = ref('')
const selectedPermissionIds = ref<string[]>([])
const createPermissionIds = ref<string[]>([])

const saving = ref(false)

const { data: roles, status: rolesStatus, refresh: refreshRoles } = useLazyFetch('/api/rbac/roles', { server: false })
const { data: permissions } = useLazyFetch('/api/rbac/permissions', { server: false })

const rolesLoading = computed(() => rolesStatus.value === 'pending' || rolesStatus.value === 'idle')

function openCreate() {
  roleName.value = ''
  roleDescription.value = ''
  createPermissionIds.value = []
  createOpen.value = true
}

async function createRole() {
  if (!roleName.value)
    return
  saving.value = true
  try {
    const created = await $fetch<RoleRow>('/api/rbac/roles', {
      method: 'POST',
      body: { name: roleName.value, description: roleDescription.value || undefined },
    })
    if (createPermissionIds.value.length > 0) {
      await $fetch(`/api/rbac/roles/${created.id}/permissions` as const, {
        method: 'PUT',
        body: { permissionIds: createPermissionIds.value },
      })
    }
    toast.add({ title: 'Role created', color: 'success', icon: 'i-lucide-check-circle' })
    createOpen.value = false
    await refreshRoles()
  }
  catch (err) {
    onError(err, 'Failed to create role')
  }
  finally {
    saving.value = false
  }
}

function openEdit(role: RoleRow) {
  selectedRole.value = role
  roleName.value = role.name
  roleDescription.value = role.description ?? ''
  selectedPermissionIds.value = [...(role.permissionIds || [])]
  editOpen.value = true
}

async function saveRole() {
  if (!selectedRole.value || !roleName.value)
    return
  saving.value = true
  try {
    await $fetch(`/api/rbac/roles/${selectedRole.value.id}`, {
      method: 'PUT',
      body: { name: roleName.value, description: roleDescription.value || undefined },
    })
    await $fetch(`/api/rbac/roles/${selectedRole.value.id}/permissions`, {
      method: 'PUT',
      body: { permissionIds: selectedPermissionIds.value },
    })
    toast.add({ title: 'Role updated', color: 'success', icon: 'i-lucide-check-circle' })
    editOpen.value = false
    await refreshRoles()
  }
  catch (err) {
    onError(err, 'Failed to update role')
  }
  finally {
    saving.value = false
  }
}

function confirmDelete(role: RoleRow) {
  roleToDelete.value = role
  deleteOpen.value = true
}

async function deleteRole() {
  if (!roleToDelete.value)
    return
  saving.value = true
  try {
    await $fetch(`/api/rbac/roles/${roleToDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Role deleted', color: 'success', icon: 'i-lucide-check-circle' })
    deleteOpen.value = false
    await refreshRoles()
  }
  catch (err) {
    onError(err, 'Failed to delete role')
  }
  finally {
    saving.value = false
  }
}

const columns: TableColumn<RoleRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'userCount', header: 'Users' },
  { id: 'badge' },
  { id: 'actions' },
]

const filteredRoles = computed(() => {
  if (!search.value)
    return roles.value as RoleRow[]
  const q = search.value.toLowerCase()
  return ((roles.value ?? []) as RoleRow[]).filter(r =>
    r.name.toLowerCase().includes(q)
    || (r.description ?? '').toLowerCase().includes(q),
  )
})

function permId(resource: string, action: string): string | null {
  return (permissions.value as PermissionRow[] | null)?.find(p => p.resource === resource && p.action === action)?.id ?? null
}

function toggleCreatePerm(resource: string, action: string) {
  const id = permId(resource, action)
  if (!id)
    return
  const idx = createPermissionIds.value.indexOf(id)
  createPermissionIds.value = idx === -1
    ? [...createPermissionIds.value, id]
    : createPermissionIds.value.filter(v => v !== id)
}

function toggleCreateAll(resource: string) {
  const perms = (permissions.value ?? []) as PermissionRow[]
  const rPerms = perms.filter(p => p.resource === resource)
  const allSelected = rPerms.every(p => createPermissionIds.value.includes(p.id))
  if (allSelected) {
    const remove = new Set(rPerms.map(p => p.id))
    createPermissionIds.value = createPermissionIds.value.filter(id => !remove.has(id))
  }
  else {
    const current = new Set(createPermissionIds.value)
    for (const p of rPerms)
      current.add(p.id)
    createPermissionIds.value = [...current]
  }
}

function toggleEditPerm(resource: string, action: string) {
  const id = permId(resource, action)
  if (!id)
    return
  const idx = selectedPermissionIds.value.indexOf(id)
  selectedPermissionIds.value = idx === -1
    ? [...selectedPermissionIds.value, id]
    : selectedPermissionIds.value.filter(v => v !== id)
}

function toggleEditAll(resource: string) {
  const perms = (permissions.value ?? []) as PermissionRow[]
  const rPerms = perms.filter(p => p.resource === resource)
  const allSelected = rPerms.every(p => selectedPermissionIds.value.includes(p.id))
  if (allSelected) {
    const remove = new Set(rPerms.map(p => p.id))
    selectedPermissionIds.value = selectedPermissionIds.value.filter(id => !remove.has(id))
  }
  else {
    const current = new Set(selectedPermissionIds.value)
    for (const p of rPerms)
      current.add(p.id)
    selectedPermissionIds.value = [...current]
  }
}

const resourceLabels: Record<string, string> = {
  user: 'Users',
  org_unit: 'Organisation Units',
  job_role: 'Job Roles',
  inventory: 'Inventory',
  asset: 'Assets',
  report: 'Reports',
}

const groupMeta = {
  system: { label: 'System Resources', icon: 'i-lucide-shield' },
  domain: { label: 'Domain Resources', icon: 'i-lucide-blocks' },
} as const

const resourceGroups = computed(() => {
  const perms = (permissions.value ?? []) as PermissionRow[]
  const systemResources = ['user', 'org_unit', 'job_role'] as const
  const domainResources = ['inventory', 'asset', 'report'] as const
  return [
    {
      key: 'system',
      ...groupMeta.system,
      resources: systemResources.map((resource) => {
        const resourcePerms = perms.filter(p => p.resource === resource)
        return {
          resource,
          label: resourceLabels[resource] || resource,
          permissions: ACTIONS.map(action => ({
            action,
            permission: resourcePerms.find(p => p.action === action) ?? null,
          })),
        }
      }),
    },
    {
      key: 'domain',
      ...groupMeta.domain,
      resources: domainResources.map((resource) => {
        const resourcePerms = perms.filter(p => p.resource === resource)
        return {
          resource,
          label: resourceLabels[resource] || resource,
          permissions: ACTIONS.map(action => ({
            action,
            permission: resourcePerms.find(p => p.action === action) ?? null,
          })),
        }
      }),
    },
  ]
})

function permissionCountForGroup(group: typeof resourceGroups.value[number], ids: string[]) {
  return group.resources.reduce((sum, r) => {
    return sum + r.permissions.filter(p => p.permission && ids.includes(p.permission.id)).length
  }, 0)
}

function totalInGroup(group: typeof resourceGroups.value[number]) {
  return group.resources.reduce((sum, r) => sum + r.permissions.filter(p => p.permission).length, 0)
}

function allSelectedInResource(ids: string[], resource: string) {
  const perms = (permissions.value ?? []) as PermissionRow[]
  const resourcePerms = perms.filter(p => p.resource === resource)
  return resourcePerms.length > 0 && resourcePerms.every(p => ids.includes(p.id))
}

function someSelectedInResource(ids: string[], resource: string) {
  const perms = (permissions.value ?? []) as PermissionRow[]
  const resourcePerms = perms.filter(p => p.resource === resource)
  return resourcePerms.some(p => ids.includes(p.id))
}
</script>

<template>
  <div class="flex flex-col flex-1 w-full">
    <div class="flex justify-between  px-4 py-3.5 border-b border-accented">
      <UInput v-model="search" icon="i-lucide-search" placeholder="Search roles..." />
      <UButton
        v-if="isSuperadmin()"
        icon="i-lucide-plus"
        label="Create role"
        @click="openCreate"
      />
    </div>
    <UTable
      :data="filteredRoles"
      :columns="columns"
      :loading="rolesLoading"
    >
      <template #badge-cell="{ row }">
        <UBadge v-if="row.original.isSystem" label="System" color="neutral" variant="subtle" size="sm" />
        <span v-else-if="(row.original.permissionIds?.length || 0) > 0" class="text-xs text-muted">{{ row.original.permissionIds.length }} perm</span>
      </template>

      <template #userCount-cell="{ row }">
        <span v-if="row.original.userCount > 0" class="text-xs">{{ row.original.userCount }} user{{ row.original.userCount !== 1 ? 's' : '' }}</span>
        <span v-else class="text-xs text-muted">—</span>
      </template>

      <template #actions-cell="{ row }">
        <div v-if="!row.original.isSystem" class="flex gap-1">
          <UTooltip text="Edit role">
            <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" square @click="openEdit(row.original)" />
          </UTooltip>
          <UTooltip text="Delete role">
            <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm" square @click="confirmDelete(row.original)" />
          </UTooltip>
        </div>
      </template>

      <template #empty>
        <div class="flex flex-col items-center gap-2 py-8">
          <UIcon name="i-lucide-key-round" class="size-8 text-muted" />
          <p class="text-sm text-muted">
            No roles found
          </p>
        </div>
      </template>
    </UTable>
  </div>

  <UModal v-model:open="createOpen" title="Create role" description="Add a new custom role" class="max-w-lg">
    <template #body>
      <div class="space-y-5">
        <div class="grid grid-cols-2 gap-4">
          <UFormField name="name" label="Name" required>
            <UInput v-model="roleName" placeholder="e.g. Manager" class="w-full" />
          </UFormField>
          <UFormField name="description" label="Description">
            <UInput v-model="roleDescription" placeholder="Optional description" class="w-full" />
          </UFormField>
        </div>

        <USeparator label="Permissions (optional)" />

        <div v-if="!permissions?.length" class="text-sm text-muted text-center py-4">
          No permissions available. Seed the RBAC system first.
        </div>

        <template v-else>
          <div v-for="group in resourceGroups" :key="group.key" class="space-y-2">
            <div class="flex items-center gap-2 px-1">
              <UIcon :name="group.icon" class="size-4 text-muted" />
              <span class="text-xs font-semibold uppercase tracking-wider text-muted">{{ group.label }}</span>
              <span class="text-xs text-muted ml-auto">
                {{ permissionCountForGroup(group, createPermissionIds) }} / {{ totalInGroup(group) }}
              </span>
            </div>
            <div class="max-h-60 overflow-y-auto space-y-1 pr-1">
              <div
                v-for="row in group.resources"
                :key="row.resource"
                class="grid grid-cols-5 items-center gap-2 rounded-lg border border-default/20 px-3 py-2"
              >
                <div class="flex items-center gap-2">
                  <UCheckbox
                    :model-value="allSelectedInResource(createPermissionIds, row.resource) ? true : someSelectedInResource(createPermissionIds, row.resource) ? 'indeterminate' : false"
                    @update:model-value="() => toggleCreateAll(row.resource)"
                  />
                  <span class="text-sm font-medium">{{ row.label }}</span>
                </div>
                <div
                  v-for="{ action, permission } in row.permissions"
                  :key="action"
                  class="flex justify-center"
                >
                  <USwitch
                    v-if="permission"
                    :model-value="createPermissionIds.includes(permission.id)"
                    @update:model-value="() => toggleCreatePerm(row.resource, action)"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
    <template #footer="{ close }">
      <div class="flex items-center justify-between w-full">
        <span class="text-xs text-muted">
          {{ createPermissionIds.length }} / {{ permissions?.length || 0 }} permissions selected
        </span>
        <div class="flex gap-3">
          <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
          <UButton label="Create" :loading="saving" :disabled="!roleName" @click="createRole" />
        </div>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="editOpen" :title="`Edit — ${selectedRole?.name || ''}`" description="Update role details and configure permissions" class="max-w-lg">
    <template #body>
      <div class="space-y-5">
        <div class="grid grid-cols-2 gap-4">
          <UFormField name="name" label="Name" required>
            <UInput v-model="roleName" class="w-full" />
          </UFormField>
          <UFormField name="description" label="Description">
            <UInput v-model="roleDescription" placeholder="Optional" class="w-full" />
          </UFormField>
        </div>

        <USeparator label="Permissions" />

        <div v-if="!permissions?.length" class="text-sm text-muted text-center py-4">
          No permissions available. Seed the RBAC system first.
        </div>

        <template v-else>
          <div v-for="group in resourceGroups" :key="group.key" class="space-y-2">
            <div class="flex items-center gap-2 px-1">
              <UIcon :name="group.icon" class="size-4 text-muted" />
              <span class="text-xs font-semibold uppercase tracking-wider text-muted">{{ group.label }}</span>
              <span class="text-xs text-muted ml-auto">
                {{ permissionCountForGroup(group, selectedPermissionIds) }} / {{ totalInGroup(group) }}
              </span>
            </div>
            <div class="max-h-60 overflow-y-auto space-y-1 pr-1">
              <div
                v-for="row in group.resources"
                :key="row.resource"
                class="grid grid-cols-5 items-center gap-2 rounded-lg border border-default/20 px-3 py-2"
              >
                <div class="flex items-center gap-2">
                  <UCheckbox
                    :model-value="allSelectedInResource(selectedPermissionIds, row.resource) ? true : someSelectedInResource(selectedPermissionIds, row.resource) ? 'indeterminate' : false"
                    @update:model-value="() => toggleEditAll(row.resource)"
                  />
                  <span class="text-sm font-medium">{{ row.label }}</span>
                </div>
                <div
                  v-for="{ action, permission } in row.permissions"
                  :key="action"
                  class="flex justify-center"
                >
                  <USwitch
                    v-if="permission"
                    :model-value="selectedPermissionIds.includes(permission.id)"
                    @update:model-value="() => toggleEditPerm(row.resource, action)"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
    <template #footer="{ close }">
      <div class="flex items-center justify-between w-full">
        <div class="text-xs text-muted">
          {{ selectedPermissionIds.length }} / {{ permissions?.length || 0 }} permissions selected
        </div>
        <div class="flex gap-3 ml-auto">
          <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
          <UButton label="Save" :loading="saving" :disabled="!roleName" @click="saveRole" />
        </div>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="deleteOpen" title="Delete role" description="This action cannot be undone">
    <template #body>
      <p class="text-sm">
        Are you sure you want to delete <strong>{{ roleToDelete?.name }}</strong>?
      </p>

      <div v-if="roleToDelete && roleToDelete.userCount > 0" class="mt-3 rounded-lg bg-warning/10 border border-warning/20 p-3">
        <div class="flex items-start gap-2">
          <UIcon name="i-lucide-alert-triangle" class="size-4 text-warning mt-0.5 shrink-0" />
          <div>
            <p class="text-sm font-medium text-warning">
              Users affected
            </p>
            <p class="text-xs text-muted mt-0.5">
              {{ roleToDelete.userCount }} user{{ roleToDelete.userCount !== 1 ? 's are' : ' is' }} assigned this role.
              Deleting it will remove the role from those users, and they will lose its permissions.
            </p>
          </div>
        </div>
      </div>

      <p class="text-xs text-muted mt-3">
        This will also remove all permission assignments for this role. System roles cannot be deleted.
      </p>
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end gap-3">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton label="Delete" color="error" :loading="saving" @click="deleteRole" />
      </div>
    </template>
  </UModal>
</template>
