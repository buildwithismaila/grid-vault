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
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: {
        token: route.params.token,
        ...event.data,
      },
    })
    toast.add({
      title: 'Password reset',
      description: 'Your password has been changed. You can now sign in.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    await router.push('/login')
  }
  catch (err: any) {
    error.value = err.data?.statusMessage || 'Failed to reset password'
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
          Reset password
        </h1>
        <p class="mt-1 text-sm text-muted">
          Enter your new password
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

      <UFormField name="password" label="New password" required>
        <template #default>
          <UInput v-model="state.password" type="password" placeholder="Min 8 characters" class="w-full" />
          <PasswordStrength :password="state.password!" />
        </template>
      </UFormField>

      <UFormField name="confirmPassword" label="Confirm password" required>
        <UInput v-model="state.confirmPassword" type="password" placeholder="Repeat your password" class="w-full" />
      </UFormField>

      <UButton type="submit" :loading="loading" label="Reset password" block />
    </UForm>

    <template #footer>
      <p class="text-center text-sm text-muted">
        <NuxtLink to="/login" class="text-primary font-medium">
          Back to sign in
        </NuxtLink>
      </p>
    </template>
  </UCard>
</template>
