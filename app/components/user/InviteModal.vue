<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import * as z from 'zod'

defineProps<{
  open: boolean
  roleOptions: string[]
  orgUnits?: { id: string, name: string }[]
  jobRoles?: { id: string, name: string }[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

const { onError, toast } = useToastError()

const schema = z.object({
  email: z.string().email('Invalid email').toLowerCase().trim(),
  role: z.string().min(1, 'Role is required'),
  name: z.string().max(255).trim().optional(),
  payrollId: z.string().max(6).trim().optional(),
  locationId: z.string().optional(),
  jobRoleId: z.string().optional(),
})
type Schema = z.output<typeof schema>

const formRef = useTemplateRef('inviteForm')
const state = reactive<Partial<Schema>>({ email: '', role: 'Viewer' })
const inviting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
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
    emit('update:open', false)
    state.email = ''
    state.role = 'Viewer'
    state.name = ''
    state.payrollId = ''
    state.locationId = ''
    state.jobRoleId = ''
    emit('saved')
  }
  catch (err) {
    onError(err, 'Failed to send invite')
  }
  finally {
    inviting.value = false
  }
}
</script>

<template>
  <UModal :open="open" title="Invite user" description="Set up a new user and send an invitation email" @update:open="emit('update:open', $event)">
    <template #body>
      <UForm
        ref="inviteForm"
        :key="open ? 'invite-open' : 'invite-closed'"
        :schema="schema"
        :state="state"
        class="space-y-0"
        @submit="onSubmit"
      >
        <div class="max-w-sm mx-auto space-y-5 py-1">
          <UFormField name="email" label="Email" required hint="Required">
            <UInput v-model="state.email" type="email" placeholder="user@example.com" class="w-full" />
          </UFormField>
          <UFormField name="name" label="Name">
            <UInput v-model="state.name" placeholder="Full name" class="w-full" />
          </UFormField>
          <UFormField name="payrollId" label="Payroll ID" hint="Max 6 characters">
            <UInput v-model="state.payrollId" placeholder="e.g. 000001" maxlength="6" class="w-full" />
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
          <UFormField name="role" label="Initial role" required hint="Required">
            <USelect v-model="state.role" :items="roleOptions" class="w-full" />
          </UFormField>
        </div>
      </UForm>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton label="Cancel" color="neutral" variant="outline" @click="emit('update:open', false)" />
        <UButton :loading="inviting" label="Send invite" @click="formRef?.submit()" />
      </div>
    </template>
  </UModal>
</template>
