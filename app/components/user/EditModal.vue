<script setup lang="ts">
import type { UserRow } from '#shared/types/admin'
import type { FormSubmitEvent } from '@nuxt/ui'
import * as z from 'zod'

const props = defineProps<{
  open: boolean
  user: UserRow | null
  orgUnits?: { id: string, name: string }[]
  jobRoles?: { id: string, name: string }[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

const { onError, toast } = useToastError()

const editStatusOptions = ['ACTIVE', 'INACTIVE', 'PENDING'].map(v => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }))

const schema = z.object({
  name: z.string().max(255).trim().optional(),
  payrollId: z.string().max(6).trim().optional(),
  email: z.string().email('Invalid email').toLowerCase().trim().optional(),
  locationId: z.string().optional(),
  jobRoleId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']),
})
type Schema = z.output<typeof schema>

const formRef = useTemplateRef('editForm')
const state = reactive<Partial<Schema>>({})
const saving = ref(false)

watch(() => props.open, (open) => {
  if (open && props.user) {
    state.name = props.user.name ?? ''
    state.payrollId = props.user.payrollId ?? ''
    state.email = props.user.email
    state.locationId = props.user.locationId ?? ''
    state.jobRoleId = props.user.jobRoleId ?? ''
    state.status = props.user.status as 'ACTIVE' | 'INACTIVE' | 'PENDING'
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.user)
    return
  saving.value = true
  try {
    const body: Record<string, unknown> = {
      name: event.data.name || undefined,
      payrollId: event.data.payrollId || undefined,
      locationId: event.data.locationId || null,
      jobRoleId: event.data.jobRoleId || null,
      status: event.data.status,
    }
    if (event.data.email !== props.user.email)
      body.email = event.data.email

    await $fetch(`/api/admin/users/${props.user.id}` as const, {
      method: 'PUT',
      body,
    })
    toast.add({ title: 'User updated', color: 'success', icon: 'i-lucide-check-circle' })
    emit('update:open', false)
    emit('saved')
  }
  catch (err) {
    onError(err, 'Failed to update user')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal :open="open" :title="`Edit user — ${user?.name || user?.email || ''}`" description="Update user details" @update:open="emit('update:open', $event)">
    <template #body>
      <UForm
        ref="editForm"
        :key="open ? 'edit-open' : 'edit-closed'"
        :schema="schema"
        :state="state"
        class="space-y-0"
        @submit="onSubmit"
      >
        <div class="max-w-sm mx-auto space-y-5 py-1">
          <UFormField name="name" label="Name">
            <UInput v-model="state.name" class="w-full" />
          </UFormField>
          <UFormField name="payrollId" label="Payroll ID">
            <UInput v-model="state.payrollId" maxlength="6" class="w-full" />
          </UFormField>
          <UFormField name="email" label="Email">
            <UInput v-model="state.email" type="email" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField name="locationId" label="Location">
              <USelect
                v-model="state.locationId"
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
                v-model="state.jobRoleId"
                :items="jobRoles ?? []"
                value-key="id"
                label-key="name"
                :loading="!jobRoles"
                placeholder="Select job role"
                class="w-full"
              />
            </UFormField>
          </div>
          <UFormField name="status" label="Status" required>
            <USelect v-model="state.status" :items="editStatusOptions" class="w-full" />
          </UFormField>
        </div>
      </UForm>
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end gap-3">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton :loading="saving" label="Save" @click="formRef?.submit()" />
      </div>
    </template>
  </UModal>
</template>
