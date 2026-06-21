<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import * as z from 'zod'

definePageMeta({ layout: 'auth' })

const { fetch: refreshSession } = useUserSession()
const router = useRouter()
const { globalError, handleApiError, resetErrors } = useFormError()
const loading = ref(false)
const mfaToken = ref('')
const mfaCode = ref<string[]>([])
const mfaLoading = ref(false)
const step = ref<'login' | 'mfa'>('login')

const schema = z.object({
  email: z.email('Invalid email').toLowerCase().trim(),
  password: z.string('Password is required'),
})

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  resetErrors()

  try {
    const res = await $fetch<{ mfaRequired?: boolean, mfaToken?: string }>('/api/auth/login', {
      method: 'POST',
      body: event.data,
    })
    if (res.mfaRequired && res.mfaToken) {
      mfaToken.value = res.mfaToken
      step.value = 'mfa'
      return
    }
    await refreshSession()
    await router.push('/')
  }
  catch (err) {
    handleApiError(err, 'Login failed')
  }
  finally {
    loading.value = false
  }
}

async function verifyMfa() {
  resetErrors()
  const code = mfaCode.value.join('')
  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    globalError.value = 'Enter a valid 6-digit code'
    return
  }
  mfaLoading.value = true
  try {
    await $fetch('/api/auth/mfa/challenge', {
      method: 'POST',
      body: { mfaToken: mfaToken.value, code },
    })
    await refreshSession()
    await router.push('/')
  }
  catch (err) {
    handleApiError(err, 'Verification failed')
  }
  finally {
    mfaLoading.value = false
  }
}
</script>

<template>
  <UPageCard class="w-full max-w-md">
    <UAuthForm
      v-if="step === 'login'"
      title="Welcome back"
      description="Sign in to your account"
      icon="i-lucide-lock"
      :fields="[
        { name: 'email', type: 'email', label: 'Email', placeholder: 'Enter your email', required: true },
        { name: 'password', label: 'Password', type: 'password', placeholder: 'Enter your password', required: true },
      ]"
      :schema="schema"
      :submit="{ label: 'Sign in', block: true, loading }"
      @submit="onSubmit"
    >
      <template #password-hint>
        <NuxtLink to="/forgot-password" class="text-primary text-sm font-medium">
          Forgot password?
        </NuxtLink>
      </template>

      <template #validation>
        <UAlert
          v-if="globalError"
          :title="globalError"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          :close-button="{
            'icon': 'i-lucide-x',
            'aria-label': 'Dismiss',
            'onClick': resetErrors,
          }"
        />
      </template>
    </UAuthForm>

    <UCard v-else class="border-none shadow-none">
      <template #header>
        <div class="text-center">
          <h1 class="text-xl font-semibold text-default">
            Two-Factor Authentication
          </h1>
          <p class="mt-1 text-sm text-muted">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>
      </template>

      <UAlert
        v-if="globalError"
        :title="globalError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        class="mb-4"
        :close-button="{
          'icon': 'i-lucide-x',
          'aria-label': 'Dismiss',
          'onClick': resetErrors,
        }"
      />

      <div class="flex justify-center py-4">
        <UPinInput
          v-model="mfaCode"
          length="6"
          type="number"
          otp
          placeholder="○"
          size="xl"
          :ui="{ root: 'gap-3' }"
          @complete="verifyMfa"
        />
      </div>

      <template #footer>
        <div class="flex flex-col gap-2">
          <UButton label="Verify" block :loading="mfaLoading" @click="verifyMfa" />
          <UButton
            label="Back to sign in"
            color="neutral"
            variant="ghost"
            block
            @click="step = 'login'; resetErrors(); mfaToken = ''; mfaCode = []"
          />
        </div>
      </template>
    </UCard>
  </UPageCard>
</template>
