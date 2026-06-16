<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import * as z from 'zod'

definePageMeta({ layout: 'auth' })

const loading = ref(false)
const submitted = ref(false)

const schema = z.object({
  email: z.email('Invalid email').toLowerCase().trim(),
})

type Schema = z.output<typeof schema>
const state = reactive<Partial<Schema>>({ email: '' })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true

  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: event.data,
    })
    submitted.value = true
  }
  catch {
    submitted.value = true
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
          Forgot password
        </h1>
        <p class="mt-1 text-sm text-muted">
          Enter your email to receive a reset link
        </p>
      </div>
    </template>

    <template v-if="submitted">
      <p class="text-sm text-muted">
        If an account with that email exists, a password reset link has been sent.
      </p>
      <UButton
        label="Back to login"
        color="neutral"
        variant="outline"
        block
        class="mt-4"
        @click="navigateTo('/login')"
      />
    </template>

    <UForm
      v-else
      :schema="schema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField name="email" label="Email" required>
        <UInput v-model="state.email" type="email" placeholder="you@example.com" class="w-full" />
      </UFormField>

      <UButton type="submit" :loading="loading" label="Send reset link" block />
    </UForm>

    <template #footer>
      <p class="text-center text-sm text-muted">
        Remember your password?
        <NuxtLink to="/login" class="text-primary font-medium">
          Sign in
        </NuxtLink>
      </p>
    </template>
  </UCard>
</template>
