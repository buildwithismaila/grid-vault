<script setup lang="ts">
import type { UserRow } from '#shared/types/admin'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { SortingState } from '@tanstack/vue-table'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { formatEnum } from '#shared/utils'

const { can } = useAuthorization()
const { onError, toast } = useToastError()
const table = useTemplateRef('table')

const inviteOpen = ref(false)
const editOpen = ref(false)
const rolesOpen = ref(false)
const deleteOpen = ref(false)

const selectedUser = ref<UserRow | null>(null)
const userToDelete = ref<UserRow | null>(null)

const { data: allRoles } = useLazyFetch('/api/rbac/roles', { server: false })
const roleOptions = computed(() => ((allRoles.value ?? []) as any[]).map((r: any) => r.name))

const search = ref('')
const statusFilter = ref('all')
const pagination = ref({ pageIndex: 0, pageSize: 15 })
const sorting = ref<SortingState>([])

const { data: users, status: fetchStatus, refresh } = useLazyFetch('/api/admin/users', { server: false })
const { data: roles } = useLazyFetch('/api/rbac/roles', { server: false })
const { data: orgUnits } = useLazyFetch('/api/org-units', { server: false })
const { data: jobRoles } = useLazyFetch('/api/job-roles', { server: false })

const loading = computed(() => fetchStatus.value === 'pending' || fetchStatus.value === 'idle')

const filteredUsers = computed(() => {
  let data = (users.value ?? []) as UserRow[]

  if (statusFilter.value !== 'all') {
    const statusMap: Record<string, UserRow['status']> = {
      active: 'ACTIVE',
      pending: 'PENDING',
      disabled: 'INACTIVE',
    }
    data = data.filter(u => u.status === statusMap[statusFilter.value])
  }

  if (search.value) {
    const q = search.value.toLowerCase()
    data = data.filter(u =>
      (u.name ?? '').toLowerCase().includes(q)
      || (u.email ?? '').toLowerCase().includes(q),
    )
  }

  return data
})

const totalCount = computed(() => (users.value ?? []).length)
const activeCount = computed(() => (users.value ?? []).filter((u: UserRow) => u.status === 'ACTIVE').length)
const pendingCount = computed(() => (users.value ?? []).filter((u: UserRow) => u.status === 'PENDING').length)
const disabledCount = computed(() => (users.value ?? []).filter((u: UserRow) => u.status === 'INACTIVE').length)

const statusOptions = computed(() => [
  { label: 'All', value: 'all', count: totalCount.value },
  { label: 'Active', value: 'active', count: activeCount.value },
  { label: 'Pending', value: 'pending', count: pendingCount.value },
  { label: 'Disabled', value: 'disabled', count: disabledCount.value },
])

const columns: TableColumn<UserRow>[] = [
  { id: 'payrollId', accessorKey: 'payrollId', header: 'Payroll ID', enableSorting: true },
  { id: 'name', accessorKey: 'name', header: 'Name', enableSorting: true },
  { id: 'email', accessorKey: 'email', header: 'Email', enableSorting: true },
  { id: 'roles', header: 'Roles' },
  { id: 'status', accessorKey: 'status', header: 'Status', enableSorting: true },
  { id: 'locationName', accessorKey: 'locationName', header: 'Location' },
  { id: 'jobRoleName', accessorKey: 'jobRoleName', header: 'Job Role' },
  { id: 'invitedByName', accessorKey: 'invitedByName', header: 'Invited By' },
  { id: 'inviteExpiresAt', accessorKey: 'inviteExpiresAt', header: 'Invite Expires' },
  { id: 'createdAt', accessorKey: 'createdAt', header: 'Created', enableSorting: true },
  { id: 'actions' },
]

async function toggleStatus(user: UserRow) {
  const newStatus: UserRow['status'] = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  try {
    await $fetch(`/api/admin/users/${user.id}` as const, {
      method: 'PUT',
      body: { status: newStatus },
    })
    toast.add({ title: `User ${newStatus === 'ACTIVE' ? 'enabled' : 'disabled'}`, color: 'success', icon: 'i-lucide-check-circle' })
    await refresh()
  }
  catch (err) {
    onError(err, 'Failed to update status')
  }
}

async function resendInvite(user: UserRow) {
  try {
    const res = await $fetch<{ token?: string }>(`/api/admin/invites/${user.inviteId}/resend`, { method: 'POST' })
    toast.add({ title: 'Invitation resent', color: 'success', icon: 'i-lucide-check-circle' })
    if (res.token && import.meta.dev) {
      await navigator.clipboard.writeText(`${window.location.origin}/accept-invite/${res.token}`)
      toast.add({ title: 'Dev: invite link copied to clipboard', color: 'info', icon: 'i-lucide-link' })
    }
    await refresh()
  }
  catch (err) {
    onError(err, 'Failed to resend invite')
  }
}

async function generateInviteLink(user: UserRow) {
  try {
    const res = await $fetch<{ token?: string }>(`/api/admin/invites/${user.inviteId}/resend` as const, { method: 'POST' })
    if (res.token) {
      await navigator.clipboard.writeText(`${window.location.origin}/accept-invite/${res.token}`)
      toast.add({ title: 'New invite link generated and copied', color: 'success', icon: 'i-lucide-link' })
    }
    else {
      toast.add({ title: 'A new invitation has been sent by email', color: 'success', icon: 'i-lucide-mail' })
    }
    await refresh()
  }
  catch (err) {
    onError(err, 'Failed to generate link')
  }
}

async function cancelInvite(user: UserRow) {
  try {
    await $fetch(`/api/admin/invites/${user.inviteId}` as const, { method: 'DELETE' })
    toast.add({ title: 'Invitation cancelled', color: 'success', icon: 'i-lucide-check-circle' })
    await refresh()
  }
  catch (err) {
    onError(err, 'Failed to cancel invite')
  }
}

async function resetUserPassword(user: UserRow) {
  try {
    const res = await $fetch<{ token?: string }>(`/api/admin/users/${user.id}/reset-password` as const, { method: 'POST' })
    toast.add({ title: 'Password reset email sent', color: 'success', icon: 'i-lucide-mail' })
    if (res.token && import.meta.dev) {
      await navigator.clipboard.writeText(`${window.location.origin}/reset-password/${res.token}`)
      toast.add({ title: 'Dev: reset link copied to clipboard', color: 'info', icon: 'i-lucide-link' })
    }
    await refresh()
  }
  catch (err) {
    onError(err, 'Failed to reset password')
  }
}

function openEdit(user: UserRow) {
  selectedUser.value = user
  editOpen.value = true
}

function openRoleAssignment(user: UserRow) {
  selectedUser.value = user
  rolesOpen.value = true
}

function confirmDelete(user: UserRow) {
  userToDelete.value = user
  deleteOpen.value = true
}

function getActionItems(user: UserRow) {
  if (user.status === 'PENDING') {
    return [
      [{ label: 'Resend invitation', icon: 'i-lucide-mail', onSelect: () => resendInvite(user) }],
      [{ label: 'Generate invite link', icon: 'i-lucide-link', onSelect: () => generateInviteLink(user) }],
      [{ label: 'Cancel invitation', icon: 'i-lucide-x', color: 'error' as const, onSelect: () => cancelInvite(user) }],
    ] satisfies DropdownMenuItem[][]
  }
  if (user.status === 'INACTIVE') {
    const items: DropdownMenuItem[][] = [
      [{ label: 'Enable user', icon: 'i-lucide-play', color: 'success' as const, onSelect: () => toggleStatus(user) }],
      [{ label: 'Edit user', icon: 'i-lucide-pencil', onSelect: () => openEdit(user) }],
    ]
    if (can('user:delete')) {
      items.push([{ label: 'Delete user', icon: 'i-lucide-trash', color: 'error' as const, onSelect: () => confirmDelete(user) }])
    }
    return items
  }
  const items: DropdownMenuItem[][] = [
    [{ label: 'Edit user', icon: 'i-lucide-pencil', onSelect: () => openEdit(user) }],
    [{ label: 'Manage roles', icon: 'i-lucide-user-round-cog', onSelect: () => openRoleAssignment(user) }],
    [{ label: 'Disable user', icon: 'i-lucide-pause', color: 'warning' as const, onSelect: () => toggleStatus(user) }],
    [{ label: 'Reset password', icon: 'i-lucide-key-round', onSelect: () => resetUserPassword(user) }],
  ]
  if (can('user:delete')) {
    items.push([{ label: 'Delete user', icon: 'i-lucide-trash', color: 'error' as const, onSelect: () => confirmDelete(user) }])
  }
  return items
}
</script>

<template>
  <div v-if="users" class="w-full">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h3 class="text-xl font-bold">
          Manage Users
        </h3>
      </div>
      <UButton
        v-if="can('user:create')"
        icon="i-lucide-plus"
        label="Invite user"
        @click="inviteOpen = true"
      />
    </div>

    <UserStatCards
      :total="totalCount"
      :active="activeCount"
      :pending="pendingCount"
      :disabled="disabledCount"
    />

    <div class="flex items-center px-4 py-3.5 border-b border-accented justify-between gap-4 w-full overflow-x-auto">
      <div class="flex items-center gap-2 flex-1">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Search name or email..." class="w-64" />
      </div>
      <div class="flex items-center gap-2">
        <div class="flex gap-1">
          <UButton
            v-for="opt in statusOptions"
            :key="opt.value"
            :label="opt.label"
            :color="statusFilter === opt.value ? 'primary' : 'neutral'"
            variant="outline"
            size="sm"
            class="min-w-20"
            @click="statusFilter = opt.value"
          >
            <template #trailing>
              <span class="text-xs" :class="statusFilter === opt.value ? 'text-primary-foreground' : 'text-muted'">{{ opt.count }}</span>
            </template>
          </UButton>
        </div>
      </div>
    </div>

    <UTable
      ref="table"
      v-model:pagination="pagination"
      v-model:sorting="sorting"
      :data="filteredUsers"
      :columns="columns"
      :loading="loading"
      :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
    >
      <template #payrollId-cell="{ row }">
        <span v-if="row.original.payrollId" class="font-mono text-sm">{{ row.original.payrollId }}</span>
        <span v-else class="text-muted text-sm">—</span>
      </template>

      <template #name-cell="{ row }">
        <span v-if="row.original.name" class="font-medium">{{ row.original.name }}</span>
        <span v-else class="text-muted">—</span>
      </template>

      <template #status-cell="{ row }">
        <UBadge
          :label="formatEnum(row.original.status)"
          :color="row.original.status === 'ACTIVE' ? 'success' : row.original.status === 'PENDING' ? 'warning' : 'error'"
          variant="subtle"
        />
      </template>

      <template #locationName-cell="{ row }">
        <span class="text-muted text-sm">{{ row.original.locationName || '—' }}</span>
      </template>

      <template #jobRoleName-cell="{ row }">
        <span class="text-muted text-sm">{{ row.original.jobRoleName || '—' }}</span>
      </template>

      <template #roles-cell="{ row }">
        <div class="flex flex-wrap gap-1">
          <UBadge :label="row.original.role" color="primary" variant="solid" size="sm" />
          <template v-for="role in row.original.customRoles" :key="role">
            <UBadge :label="role" color="neutral" variant="subtle" size="sm" />
          </template>
        </div>
      </template>

      <template #invitedByName-cell="{ row }">
        <span class="text-muted text-sm">{{ row.original.invitedByName || '—' }}</span>
      </template>

      <template #inviteExpiresAt-cell="{ row }">
        <span v-if="row.original.inviteExpiresAt" class="text-muted text-sm">
          {{ new Date(row.original.inviteExpiresAt).toLocaleDateString() }}
        </span>
        <span v-else class="text-muted text-sm">—</span>
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-muted text-sm">{{ new Date(row.original.createdAt).toLocaleDateString() }}</span>
      </template>

      <template #actions-cell="{ row }">
        <UDropdownMenu
          v-if="row.original.role !== 'Superadmin'"
          :items="getActionItems(row.original)"
        >
          <UButton icon="i-lucide-ellipsis" color="neutral" variant="ghost" size="sm" square />
        </UDropdownMenu>
      </template>

      <template #empty>
        <div class="flex flex-col items-center gap-2 py-12">
          <UIcon name="i-lucide-users" class="size-10 text-muted" />
          <p class="text-sm font-medium">
            No users found
          </p>
          <p class="text-xs text-muted">
            Try adjusting your search or filter
          </p>
        </div>
      </template>
    </UTable>

    <div class="flex items-center justify-between px-4 py-3">
      <p class="text-sm text-muted">
        {{ filteredUsers.length }} of {{ users?.length || 0 }} user{{ users?.length !== 1 ? 's' : '' }}
      </p>
      <div class="flex items-center gap-2">
        <USelect
          :model-value="pagination.pageSize"
          :items="[10, 15, 25, 50]"
          class="w-20"
          @update:model-value="(v: number) => { pagination.pageSize = v; pagination.pageIndex = 0 }"
        />
        <UPagination
          :page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>
    </div>
  </div>

  <UserInviteModal
    v-model:open="inviteOpen"
    :role-options="roleOptions"
    :org-units="orgUnits"
    :job-roles="jobRoles"
    @saved="refresh()"
  />

  <UserEditModal
    v-model:open="editOpen"
    :user="selectedUser"
    :role-options="roleOptions"
    :org-units="orgUnits"
    :job-roles="jobRoles"
    @saved="refresh()"
  />

  <UserRoleModal
    v-model:open="rolesOpen"
    :user="selectedUser"
    :roles="(roles ?? []) as any[]"
    :loading="!roles"
    @saved="refresh()"
  />

  <UserDeleteModal
    v-model:open="deleteOpen"
    :user="userToDelete"
    @saved="refresh(); userToDelete = null"
  />
</template>
