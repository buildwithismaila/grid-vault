<script setup lang="ts">
import type { RoleRow, UserRow } from '#shared/types/admin'
import type { DropdownMenuItem, FormSubmitEvent, TableColumn } from '@nuxt/ui'
import type { SortingState } from '@tanstack/vue-table'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { formatEnum } from '#shared/utils'
import * as z from 'zod'

const { can } = useAuthorization()
const { onError, toast } = useToastError()
const table = useTemplateRef('table')

const editStatusOptions = ['ACTIVE', 'INACTIVE', 'PENDING'].map(v => ({ value: v, label: formatEnum(v) }))

const { data: allRoles } = useLazyFetch('/api/rbac/roles', { server: false })
const roleOptions = computed(() => ((allRoles.value ?? []) as RoleRow[]).map(r => r.name))

const search = ref('')
const statusFilter = ref('all')
const pagination = ref({ pageIndex: 0, pageSize: 15 })
const sorting = ref<SortingState>([])

const inviteOpen = ref(false)
const editOpen = ref(false)
const rolesOpen = ref(false)
const deleteOpen = ref(false)

const selectedUser = ref<UserRow | null>(null)
const userToDelete = ref<UserRow | null>(null)
const selectedRoleIds = ref<string[]>([])

const inviteSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase().trim(),
  role: z.string().min(1, 'Role is required'),
  name: z.string().max(255).trim().optional(),
  payrollId: z.string().max(6).trim().optional(),
  locationId: z.string().optional(),
  jobRoleId: z.string().optional(),
})
type InviteSchema = z.output<typeof inviteSchema>
const inviteState = reactive<Partial<InviteSchema>>({ email: '', role: 'Viewer' })
const inviting = ref(false)

const editSchema = z.object({
  name: z.string().max(255).trim().optional(),
  payrollId: z.string().max(6).trim().optional(),
  email: z.string().email('Invalid email').toLowerCase().trim().optional(),
  locationId: z.string().nullable().optional(),
  jobRoleId: z.string().nullable().optional(),
  role: z.string().min(1, 'Role is required'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']),
})
type EditSchema = z.output<typeof editSchema>
const editState = reactive<Partial<EditSchema>>({})
const saving = ref(false)
const deleting = ref(false)

const { data: users, status: fetchStatus, refresh } = useLazyFetch('/api/admin/users', { server: false })
const { data: roles, status: rolesStatus } = useLazyFetch('/api/rbac/roles', { server: false })
const { data: orgUnits } = useLazyFetch('/api/org-units', { server: false })
const { data: jobRoles } = useLazyFetch('/api/job-roles', { server: false })

const loading = computed(() => fetchStatus.value === 'pending' || fetchStatus.value === 'idle')
const rolesLoading = computed(() => rolesStatus.value === 'pending' || rolesStatus.value === 'idle')

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

async function sendInvite(event: FormSubmitEvent<InviteSchema>) {
  inviting.value = true
  try {
    await $fetch('/api/auth/invite', {
      method: 'POST',
      body: {
        email: event.data.email,
        role: event.data.role,
        name: event.data.name || undefined,
        payrollId: event.data.payrollId || undefined,
        locationId: event.data.locationId || undefined,
        jobRoleId: event.data.jobRoleId || undefined,
      },
    })
    toast.add({ title: 'Invitation sent', color: 'success', icon: 'i-lucide-check-circle' })
    inviteOpen.value = false
    inviteState.email = ''
    inviteState.role = 'Viewer'
    inviteState.name = ''
    inviteState.payrollId = ''
    inviteState.locationId = ''
    inviteState.jobRoleId = ''
    await refresh()
  }
  catch (err) {
    onError(err, 'Failed to send invite')
  }
  finally {
    inviting.value = false
  }
}

function openEdit(user: UserRow) {
  selectedUser.value = user
  editState.name = user.name ?? ''
  editState.payrollId = user.payrollId ?? ''
  editState.email = user.email
  editState.locationId = user.locationId ?? ''
  editState.jobRoleId = user.jobRoleId ?? ''
  editState.role = user.role
  editState.status = user.status as 'ACTIVE' | 'INACTIVE' | 'PENDING'
  editOpen.value = true
}

async function saveUser(event: FormSubmitEvent<EditSchema>) {
  if (!selectedUser.value)
    return
  saving.value = true
  try {
    const body: Record<string, unknown> = {
      name: event.data.name || undefined,
      payrollId: event.data.payrollId || undefined,
      locationId: event.data.locationId || null,
      jobRoleId: event.data.jobRoleId || null,
      role: event.data.role,
      status: event.data.status,
    }
    if (event.data.email !== selectedUser.value.email)
      body.email = event.data.email

    await $fetch(`/api/admin/users/${selectedUser.value.id}` as const, {
      method: 'PUT',
      body,
    })
    toast.add({ title: 'User updated', color: 'success', icon: 'i-lucide-check-circle' })
    editOpen.value = false
    await refresh()
  }
  catch (err) {
    onError(err, 'Failed to update user')
  }
  finally {
    saving.value = false
  }
}

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

async function openRoleAssignment(user: UserRow) {
  selectedUser.value = user
  selectedRoleIds.value = []
  try {
    const userRoles = await $fetch<{ roleId: string }[]>(`/api/rbac/users/${user.id}/roles`)
    selectedRoleIds.value = userRoles.map(r => r.roleId)
  }
  catch { /* no roles yet */ }
  rolesOpen.value = true
}

async function saveUserRoles() {
  if (!selectedUser.value)
    return
  saving.value = true
  try {
    await $fetch(`/api/rbac/users/${selectedUser.value.id}/roles` as const, {
      method: 'PUT',
      body: { roleIds: selectedRoleIds.value },
    })
    toast.add({ title: 'Roles updated', color: 'success', icon: 'i-lucide-check-circle' })
    rolesOpen.value = false
    await refresh()
  }
  catch (err) {
    onError(err, 'Failed to update roles')
  }
  finally {
    saving.value = false
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

async function resetPassword(user: UserRow) {
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

function handleRoleCheckbox(roleId: string, checked: boolean | 'indeterminate') {
  if (checked) {
    selectedRoleIds.value = [...selectedRoleIds.value, roleId]
  }
  else {
    selectedRoleIds.value = selectedRoleIds.value.filter(id => id !== roleId)
  }
}

function confirmDelete(user: UserRow) {
  userToDelete.value = user
  deleteOpen.value = true
}

async function deleteUser() {
  if (!userToDelete.value)
    return
  deleting.value = true
  try {
    await $fetch(`/api/admin/users/${userToDelete.value.id}` as const, { method: 'DELETE' })
    toast.add({ title: 'User deleted', color: 'success', icon: 'i-lucide-check-circle' })
    deleteOpen.value = false
    userToDelete.value = null
    await refresh()
  }
  catch (err) {
    onError(err, 'Failed to delete user')
  }
  finally {
    deleting.value = false
  }
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
    [{ label: 'Reset password', icon: 'i-lucide-key-round', onSelect: () => resetPassword(user) }],
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

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
      <UCard variant="subtle" class="relative overflow-hidden">
        <div class="flex items-center gap-3">
          <div class="shrink-0 rounded-full bg-info/10 p-2.5">
            <UIcon name="i-lucide-users" class="size-5 text-info" />
          </div>
          <div>
            <p class="text-lg font-bold">
              {{ totalCount }}
            </p>
            <p class="text-xs text-muted">
              Total
            </p>
          </div>
        </div>
      </UCard>
      <UCard variant="subtle" class="relative overflow-hidden">
        <div class="flex items-center gap-3">
          <div class="shrink-0 rounded-full bg-success/10 p-2.5">
            <UIcon name="i-lucide-check-circle" class="size-5 text-success" />
          </div>
          <div>
            <p class="text-lg font-bold">
              {{ activeCount }}
            </p>
            <p class="text-xs text-muted">
              Active
            </p>
          </div>
        </div>
      </UCard>
      <UCard variant="subtle" class="relative overflow-hidden">
        <div class="flex items-center gap-3">
          <div class="shrink-0 rounded-full bg-warning/10 p-2.5">
            <UIcon name="i-lucide-clock" class="size-5 text-warning" />
          </div>
          <div>
            <p class="text-lg font-bold">
              {{ pendingCount }}
            </p>
            <p class="text-xs text-muted">
              Pending
            </p>
          </div>
        </div>
      </UCard>
      <UCard variant="subtle" class="relative overflow-hidden">
        <div class="flex items-center gap-3">
          <div class="shrink-0 rounded-full bg-error/10 p-2.5">
            <UIcon name="i-lucide-pause-circle" class="size-5 text-error" />
          </div>
          <div>
            <p class="text-lg font-bold">
              {{ disabledCount }}
            </p>
            <p class="text-xs text-muted">
              Disabled
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <div class="flex items-center  px-4 py-3.5 border-b border-accented justify-between gap-4 p-4 w-full overflow-x-auto">
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

  <UModal v-model:open="inviteOpen" title="Invite user" description="Set up a new user and send an invitation email">
    <UForm
      :key="inviteOpen ? 'invite-open' : 'invite-closed'"
      :schema="inviteSchema"
      :state="inviteState"
      class="space-y-0"
      @submit="sendInvite"
    >
      <template #body>
        <div class="max-w-sm mx-auto space-y-5 py-1">
          <UFormField name="email" label="Email" required hint="Required">
            <UInput v-model="inviteState.email" type="email" placeholder="user@example.com" class="w-full" />
          </UFormField>
          <UFormField name="name" label="Name">
            <UInput v-model="inviteState.name" placeholder="Full name" class="w-full" />
          </UFormField>
          <UFormField name="payrollId" label="Payroll ID" hint="Max 6 characters">
            <UInput v-model="inviteState.payrollId" placeholder="e.g. 000001" maxlength="6" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField name="locationId" label="Location">
              <USelect
                v-model="inviteState.locationId"
                :items="orgUnits ?? []"
                value-key="id"
                label-key="name"
                :loading="!orgUnits"
                placeholder="Select location"
                class="w-full"
              />
            </UFormField>
            <UFormField name="jobRoleId" label="Job Role">
              <USelect
                v-model="inviteState.jobRoleId"
                :items="jobRoles ?? []"
                value-key="id"
                label-key="name"
                :loading="!jobRoles"
                placeholder="Select job role"
                class="w-full"
              />
            </UFormField>
          </div>
          <UFormField name="role" label="Initial role" required hint="Required">
            <USelect v-model="inviteState.role" :items="roleOptions" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton label="Cancel" color="neutral" variant="outline" @click="inviteOpen = false" />
          <UButton type="submit" :loading="inviting" label="Send invite" />
        </div>
      </template>
    </UForm>
  </UModal>

  <UModal v-model:open="editOpen" :title="`Edit user — ${selectedUser?.name || selectedUser?.email || ''}`" description="Update user details">
    <UForm
      :key="editOpen ? 'edit-open' : 'edit-closed'"
      :schema="editSchema"
      :state="editState"
      class="space-y-0"
      @submit="saveUser"
    >
      <template #body>
        <div class="max-w-sm mx-auto space-y-5 py-1">
          <UFormField name="name" label="Name">
            <UInput v-model="editState.name" class="w-full" />
          </UFormField>
          <UFormField name="payrollId" label="Payroll ID">
            <UInput v-model="editState.payrollId" maxlength="6" class="w-full" />
          </UFormField>
          <UFormField name="email" label="Email">
            <UInput v-model="editState.email" type="email" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField name="locationId" label="Location">
              <USelect
                v-model="editState.locationId"
                :items="orgUnits ?? []"
                value-key="id"
                label-key="name"
                :loading="!orgUnits"
                placeholder="Select location"
                class="w-full"
              />
            </UFormField>
            <UFormField name="jobRoleId" label="Job Role">
              <USelect
                v-model="editState.jobRoleId"
                :items="jobRoles ?? []"
                value-key="id"
                label-key="name"
                :loading="!jobRoles"
                placeholder="Select job role"
                class="w-full"
              />
            </UFormField>
          </div>
          <UFormField name="role" label="Role" required>
            <USelect v-model="editState.role" :items="roleOptions" class="w-full" />
          </UFormField>
          <UFormField name="status" label="Status" required>
            <USelect v-model="editState.status" :items="editStatusOptions" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer="{ close }">
        <div class="flex justify-end gap-3">
          <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
          <UButton type="submit" :loading="saving" label="Save" />
        </div>
      </template>
    </UForm>
  </UModal>

  <UModal v-model:open="rolesOpen" :title="`Manage roles — ${selectedUser?.name || selectedUser?.email || ''}`" description="Select all roles this user should have">
    <template #body>
      <div v-if="rolesLoading" class="flex items-center justify-center gap-2 py-8">
        <UIcon name="i-lucide-loader" class="size-4 animate-spin" />
        <span class="text-sm text-muted">Loading roles...</span>
      </div>
      <div v-else-if="!roles?.length" class="py-8 text-center text-sm text-muted">
        No roles defined yet. Contact an administrator.
      </div>
      <div v-else class="space-y-3">
        <div v-for="r in (roles as RoleRow[])" :key="r.id" class="flex items-center gap-3">
          <UCheckbox
            :id="r.id"
            :model-value="selectedRoleIds.includes(r.id)"
            @update:model-value="(v: boolean | 'indeterminate') => handleRoleCheckbox(r.id, v)"
          >
            <template #label>
              <span class="font-medium">{{ r.name }}</span>
              <span v-if="r.description" class="block text-xs text-muted">{{ r.description }}</span>
            </template>
          </UCheckbox>
        </div>
      </div>
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end gap-3">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton label="Save" :loading="saving" @click="saveUserRoles" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="deleteOpen" title="Delete user" description="This action cannot be undone">
    <template #body>
      <div class="max-w-sm mx-auto space-y-5 py-1">
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-alert-triangle" class="size-5 text-error shrink-0 mt-0.5" />
          <div>
            <p class="text-sm">
              Are you sure you want to delete <strong>{{ userToDelete?.name || userToDelete?.email }}</strong>?
            </p>
            <p class="text-xs text-muted mt-2">
              This will permanently remove the user, their authentication records, custom role assignments, and invitations. This action cannot be undone.
            </p>
          </div>
        </div>
      </div>
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end gap-3">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton label="Delete" color="error" :loading="deleting" @click="deleteUser" />
      </div>
    </template>
  </UModal>
</template>
