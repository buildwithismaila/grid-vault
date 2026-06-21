<script setup lang="ts">
import type { UserRow } from '#shared/types/admin'

const props = defineProps<{
  open: boolean
  user: UserRow | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

const { onError, toast } = useToastError()

const deleting = ref(false)

async function confirm() {
  if (!props.user)
    return
  deleting.value = true
  try {
    await $fetch(`/api/admin/users/${props.user.id}` as const, { method: 'DELETE' })
    toast.add({ title: 'User deleted', color: 'success', icon: 'i-lucide-check-circle' })
    emit('update:open', false)
    emit('saved')
  }
  catch (err) {
    onError(err, 'Failed to delete user')
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <UModal :open="open" title="Delete user" description="This action cannot be undone" @update:open="emit('update:open', $event)">
    <template #body>
      <div class="max-w-sm mx-auto space-y-5 py-1">
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-alert-triangle" class="size-5 text-error shrink-0 mt-0.5" />
          <div>
            <p class="text-sm">
              Are you sure you want to delete <strong>{{ user?.name || user?.email }}</strong>?
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
        <UButton label="Delete" color="error" :loading="deleting" @click="confirm" />
      </div>
    </template>
  </UModal>
</template>
