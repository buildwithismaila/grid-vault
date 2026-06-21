<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import * as z from 'zod'

const props = defineProps<{
  endpoint: string
  title: string
  subtitle: string
  submitLabel: string
  successTitle: string
  successDescription: string
}>()

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { globalError, handleApiError, resetErrors } = useFormError()
const loading = ref(false)

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
  resetErrors()

  try {
    await $fetch(props.endpoint, {
      method: 'POST',
      body: {
        token: route.params.token,
        ...event.data,
      },
    })
    toast.add({
      title: props.successTitle,
      description: props.successDescription,
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
    await router.push('/login')
  }
  catch (err) {
    handleApiError(err, 'Failed to reset password')
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
          {{ title }}
        </h1>
        <p class="mt-1 text-sm text-muted">
          {{ subtitle }}
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

      <UFormField name="password" label="Password" required>
        <template #default>
          <UInput v-model="state.password" type="password" placeholder="Min 8 characters" class="w-full" />
          <PasswordStrength :password="state.password!" />
        </template>
      </UFormField>

      <UFormField name="confirmPassword" label="Confirm password" required>
        <UInput v-model="state.confirmPassword" type="password" placeholder="Repeat your password" class="w-full" />
      </UFormField>

      <UButton type="submit" :loading="loading" :label="submitLabel" block />
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
