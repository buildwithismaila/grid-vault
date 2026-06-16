<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { JobRoleRow } from '#shared/types/admin'

const { can } = useAuthorization()
const { onError, toast } = useToastError()

const search = ref('')
const createOpen = ref(false)
const editOpen = ref(false)
const deleteOpen = ref(false)

const selectedJobRole = ref<JobRoleRow | null>(null)
const jobRoleToDelete = ref<JobRoleRow | null>(null)

const jobRoleName = ref('')
const jobRoleDescription = ref('')

const saving = ref(false)

const { data: jobRoles, status: jobRolesStatus, refresh: refreshJobRoles } = useLazyFetch<JobRoleRow[]>('/api/job-roles', { server: false })

const loading = computed(() => jobRolesStatus.value === 'pending' || jobRolesStatus.value === 'idle')

const columns: TableColumn<JobRoleRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'description', header: 'Description' },
  { id: 'actions' },
]

const filteredJobRoles = computed(() => {
  const items = jobRoles.value ?? []
  if (!search.value)
    return items
  const q = search.value.toLowerCase()
  return items.filter(r =>
    r.name.toLowerCase().includes(q)
    || (r.description ?? '').toLowerCase().includes(q),
  )
})

function openCreate() {
  selectedJobRole.value = null
  jobRoleName.value = ''
  jobRoleDescription.value = ''
  createOpen.value = true
}

async function createJobRole() {
  if (!jobRoleName.value)
    return
  saving.value = true
  try {
    await $fetch('/api/job-roles', {
      method: 'POST',
      body: {
        name: jobRoleName.value,
        description: jobRoleDescription.value || null,
      },
    })
    toast.add({ title: 'Job role created', color: 'success', icon: 'i-lucide-check-circle' })
    createOpen.value = false
    await refreshJobRoles()
  }
  catch (err) {
    onError(err, 'Failed to create job role')
  }
  finally {
    saving.value = false
  }
}

function openEdit(role: JobRoleRow) {
  selectedJobRole.value = role
  jobRoleName.value = role.name
  jobRoleDescription.value = role.description ?? ''
  editOpen.value = true
}

async function updateJobRole() {
  if (!selectedJobRole.value || !jobRoleName.value)
    return
  saving.value = true
  try {
    await $fetch(`/api/job-roles/${selectedJobRole.value.id}`, {
      method: 'PUT',
      body: {
        name: jobRoleName.value,
        description: jobRoleDescription.value || null,
      },
    })
    toast.add({ title: 'Job role updated', color: 'success', icon: 'i-lucide-check-circle' })
    editOpen.value = false
    await refreshJobRoles()
  }
  catch (err) {
    onError(err, 'Failed to update job role')
  }
  finally {
    saving.value = false
  }
}

function confirmDelete(role: JobRoleRow) {
  jobRoleToDelete.value = role
  deleteOpen.value = true
}

async function deleteJobRole() {
  if (!jobRoleToDelete.value)
    return
  saving.value = true
  try {
    await $fetch(`/api/job-roles/${jobRoleToDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Job role deleted', color: 'success', icon: 'i-lucide-check-circle' })
    deleteOpen.value = false
    await refreshJobRoles()
  }
  catch (err) {
    onError(err, 'Failed to delete job role')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col flex-1 w-full">
    <div class="flex justify-between items-center px-4 py-3.5 border-b border-accented">
      <UInput v-model="search" icon="i-lucide-search" placeholder="Search job roles..." class="w-64" />
      <UButton
        v-if="can('job_role:create')"
        icon="i-lucide-plus"
        label="Add role"
        @click="openCreate"
      />
    </div>

    <UTable
      :data="filteredJobRoles"
      :columns="columns"
      :loading="loading"
    >
      <template #description-cell="{ row }">
        <span class="text-sm text-muted">{{ row.original.description || '—' }}</span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex gap-1">
          <UTooltip text="Edit job role">
            <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" square @click="openEdit(row.original)" />
          </UTooltip>
          <UTooltip text="Delete job role">
            <UButton icon="i-lucide-trash" color="error" variant="ghost" size="sm" square @click="confirmDelete(row.original)" />
          </UTooltip>
        </div>
      </template>

      <template #empty>
        <div class="flex flex-col items-center gap-2 py-8">
          <UIcon name="i-lucide-briefcase" class="size-8 text-muted" />
          <p class="text-sm text-muted">
            No job roles yet
          </p>
        </div>
      </template>
    </UTable>
  </div>

  <UModal v-model:open="createOpen" title="Create job role" description="Add a new job role">
    <template #body>
      <div class="max-w-sm mx-auto space-y-5 py-1">
        <UFormField name="name" label="Name" required>
          <UInput v-model="jobRoleName" placeholder="e.g. Field Officer" class="w-full" />
        </UFormField>
        <UFormField name="description" label="Description">
          <UTextarea v-model="jobRoleDescription" placeholder="Optional description" :rows="3" class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton label="Cancel" color="neutral" variant="outline" @click="createOpen = false" />
        <UButton label="Create" :loading="saving" :disabled="!jobRoleName" @click="createJobRole" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="editOpen" :title="`Edit — ${selectedJobRole?.name || ''}`" description="Update job role details">
    <template #body>
      <div class="max-w-sm mx-auto space-y-5 py-1">
        <UFormField name="name" label="Name" required>
          <UInput v-model="jobRoleName" class="w-full" />
        </UFormField>
        <UFormField name="description" label="Description">
          <UTextarea v-model="jobRoleDescription" :rows="3" class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end gap-3">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton label="Save" :loading="saving" :disabled="!jobRoleName" @click="updateJobRole" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="deleteOpen" title="Delete job role" description="This action cannot be undone">
    <template #body>
      <p class="text-sm">
        Are you sure you want to delete <strong>{{ jobRoleToDelete?.name }}</strong>?
      </p>
      <p class="text-xs text-muted mt-3">
        Users assigned to this role will have their job role set to none.
      </p>
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end gap-3">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton label="Delete" color="error" :loading="saving" @click="deleteJobRole" />
      </div>
    </template>
  </UModal>
</template>
