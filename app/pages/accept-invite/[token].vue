<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import * as z from 'zod'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const loading = ref(false)
const error = ref('')

const schema = z.object({
  password: z.string('Password is required').min(8, 'Min 8 characters').max(72),
  confirmPassword: z.string('Confirm your password'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type Schema = z.output<typeof schema>
const state = reactive<Partial<Schema>>({ password: '', confirmPassword: '' })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  error.value = ''

  try {
    await $fetch('/api/auth/accept-invite', {
      method: 'POST',
      body: {
        token: route.params.token,
        ...event.data,
      },
    })
    toast.add({
      title: 'Account activated',
      description: 'You can now sign in with your credentials.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    await router.push('/login')
  }
  catch (err: any) {
    error.value = err.data?.statusMessage || 'Failed to accept invitation'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard class="w-full max-w-sm">
    <template #header>
      <div class="text-center">
        <h1 class="text-xl font-semibold text-default">
          Accept invitation
        </h1>
        <p class="mt-1 text-sm text-muted">
          Set your password to activate your account
        </p>
      </div>
    </template>

    <UForm
      :schema="schema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UAlert
        v-if="error"
        :title="error"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        class="mb-4"
        :close-button="{
          'icon': 'i-lucide-x',
          'aria-label': 'Dismiss',
          'onClick': () => { error = '' },
        }"
      />

      <UFormField name="password" label="Password" required>
        <template #default>
          <UInput v-model="state.password" type="password" placeholder="Min 8 characters" class="w-full" />
          <PasswordStrength :password="state.password" />
        </template>
      </UFormField>

      <UFormField name="confirmPassword" label="Confirm password" required>
        <UInput v-model="state.confirmPassword" type="password" placeholder="Repeat your password" class="w-full" />
      </UFormField>

      <UButton type="submit" :loading="loading" label="Activate account" block />
    </UForm>
  </UCard>
</template>
