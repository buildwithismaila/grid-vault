<script setup lang="ts">
import type { RoleRow, UserRow } from '#shared/types/admin'

const props = defineProps<{
  open: boolean
  user: UserRow | null
  roles: RoleRow[]
  loading: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

const { onError, toast } = useToastError()

const selectedRoleIds = ref<string[]>([])
const saving = ref(false)

watch(() => props.open, async (open) => {
  if (open && props.user) {
    selectedRoleIds.value = []
    try {
      const userRoles = await $fetch<{ roleId: string }[]>(`/api/rbac/users/${props.user.id}/roles`)
      selectedRoleIds.value = userRoles.map(r => r.roleId)
    }
    catch (err) {
      onError(err, 'Failed to load user roles')
    }
  }
})

function handleCheckbox(roleId: string, checked: boolean | 'indeterminate') {
  if (checked) {
    selectedRoleIds.value = [...selectedRoleIds.value, roleId]
  }
  else {
    selectedRoleIds.value = selectedRoleIds.value.filter(id => id !== roleId)
  }
}

async function save() {
  if (!props.user)
    return
  saving.value = true
  try {
    await $fetch(`/api/rbac/users/${props.user.id}/roles` as const, {
      method: 'PUT',
      body: { roleIds: selectedRoleIds.value },
    })
    toast.add({ title: 'Roles updated', color: 'success', icon: 'i-lucide-check-circle' })
    emit('update:open', false)
    emit('saved')
  }
  catch (err) {
    onError(err, 'Failed to update roles')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal :open="open" :title="`Manage roles — ${user?.name || user?.email || ''}`" description="Select all roles this user should have" @update:open="emit('update:open', $event)">
    <template #body>
      <div v-if="loading" class="flex items-center justify-center gap-2 py-8">
        <UIcon name="i-lucide-loader" class="size-4 animate-spin" />
        <span class="text-sm text-muted">Loading roles...</span>
      </div>
      <div v-else-if="!roles.length" class="py-8 text-center text-sm text-muted">
        No roles defined yet. Contact an administrator.
      </div>
      <div v-else class="space-y-3">
        <div v-for="r in roles" :key="r.id" class="flex items-center gap-3">
          <UCheckbox
            :id="r.id"
            :model-value="selectedRoleIds.includes(r.id)"
            @update:model-value="(v: boolean | 'indeterminate') => handleCheckbox(r.id, v)"
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
        <UButton label="Save" :loading="saving" @click="save" />
      </div>
    </template>
  </UModal>
</template>
