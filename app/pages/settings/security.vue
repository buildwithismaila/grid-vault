<script setup lang="ts">
import QRCode from 'qrcode'
import { reactive } from 'vue'
import { changePasswordSchema } from '#shared/schemas/user'

const toast = useToast()
const { fieldErrors, globalError, handleApiError, resetErrors } = useFormError()
const mfaSetupForm = reactive(useFormError())
const mfaDisableForm = reactive(useFormError())

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordSaving = ref(false)

function validate(): boolean {
  resetErrors()

  const result = changePasswordSchema.safeParse({
    currentPassword: currentPassword.value,
    newPassword: newPassword.value,
    confirmPassword: confirmPassword.value,
  })

  if (result.success)
    return true

  for (const issue of result.error.issues) {
    const path = issue.path.join('.')
    if (path && path !== 'form') {
      if (!fieldErrors.value[path])
        fieldErrors.value[path] = issue.message
    }
    else {
      globalError.value = issue.message
    }
  }

  return false
}

async function changePassword() {
  if (!validate())
    return
  passwordSaving.value = true
  try {
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
        confirmPassword: confirmPassword.value,
      },
    })
    toast.add({ title: 'Password changed', color: 'success' })
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    resetErrors()
  }
  catch (err) {
    handleApiError(err, 'Failed to change password')
  }
  finally {
    passwordSaving.value = false
  }
}

const { data: mfaStatus, refresh: refreshMfa } = useLazyFetch('/api/auth/mfa/status', { server: false })

const mfaSetupOpen = ref(false)
const mfaDisableOpen = ref(false)
const mfaSetupPassword = ref('')
const mfaSetupSecret = ref('')
const mfaSetupOtpauth = ref('')
const mfaSetupQrDataUrl = ref('')
const mfaVerifyCode = ref('')
const mfaVerifyLoading = ref(false)
const mfaDisablePassword = ref('')
const mfaDisableCode = ref('')
const mfaDisableLoading = ref(false)

async function startMfaSetup() {
  mfaSetupForm.resetErrors()
  if (!mfaSetupPassword.value) {
    mfaSetupForm.globalError.value = 'Password is required'
    return
  }
  try {
    const res = await $fetch<{ secret: string, otpauth: string }>('/api/auth/mfa/setup', {
      method: 'POST',
      body: { password: mfaSetupPassword.value },
    })
    mfaSetupSecret.value = res.secret
    mfaSetupOtpauth.value = res.otpauth
    mfaSetupQrDataUrl.value = await QRCode.toDataURL(res.otpauth, { width: 256 })
    mfaSetupOpen.value = true
  }
  catch (err) {
    mfaSetupForm.handleApiError(err, 'Failed to setup MFA')
  }
}

async function verifyMfa() {
  mfaSetupForm.resetErrors()
  const code = mfaVerifyCode.value.trim()
  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    mfaSetupForm.globalError.value = 'Enter a valid 6-digit code'
    return
  }
  mfaVerifyLoading.value = true
  try {
    await $fetch('/api/auth/mfa/verify', {
      method: 'POST',
      body: { token: code },
    })
    mfaSetupOpen.value = false
    mfaSetupPassword.value = ''
    mfaSetupSecret.value = ''
    mfaSetupOtpauth.value = ''
    mfaSetupQrDataUrl.value = ''
    mfaVerifyCode.value = ''
    toast.add({ title: 'MFA enabled', color: 'success' })
    refreshMfa()
  }
  catch (err) {
    mfaSetupForm.handleApiError(err, 'Invalid verification code')
  }
  finally {
    mfaVerifyLoading.value = false
  }
}

function cancelMfaSetup() {
  mfaSetupOpen.value = false
  mfaSetupPassword.value = ''
  mfaSetupSecret.value = ''
  mfaSetupOtpauth.value = ''
  mfaSetupQrDataUrl.value = ''
  mfaVerifyCode.value = ''
  mfaSetupForm.resetErrors()
}

async function disableMfa() {
  mfaDisableForm.resetErrors()
  mfaDisableLoading.value = true
  try {
    await $fetch('/api/auth/mfa/disable', {
      method: 'POST',
      body: { password: mfaDisablePassword.value, code: mfaDisableCode.value },
    })
    toast.add({ title: 'MFA disabled', color: 'success' })
    mfaDisableOpen.value = false
    mfaDisablePassword.value = ''
    mfaDisableCode.value = ''
    await refreshMfa()
  }
  catch (err) {
    mfaDisableForm.handleApiError(err, 'Failed to disable MFA')
  }
  finally {
    mfaDisableLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-lg space-y-6 pt-6">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-shield" class="size-5" />
          <p class="font-semibold">
            Change Password
          </p>
        </div>
      </template>

      <div class="space-y-4">
        <UAlert v-if="globalError" color="error" variant="subtle" :title="globalError" icon="i-lucide-alert-circle" />

        <UFormField
          label="Current password"
          name="currentPassword"
          required
          :error="fieldErrors.currentPassword"
        >
          <UInput
            v-model="currentPassword"
            type="password"
            placeholder="Enter current password"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="New password"
          name="newPassword"
          required
          :error="fieldErrors.newPassword"
        >
          <template #default>
            <UInput
              v-model="newPassword"
              type="password"
              placeholder="Enter new password"
              class="w-full"
            />
            <PasswordStrength :password="newPassword" />
          </template>
        </UFormField>

        <UFormField
          label="Confirm new password"
          name="confirmPassword"
          required
          :error="fieldErrors.confirmPassword"
        >
          <UInput
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            class="w-full"
          />
        </UFormField>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <UButton label="Change password" :loading="passwordSaving" @click="changePassword" />
        </div>
      </template>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-fingerprint" class="size-5" />
          <p class="font-semibold">
            Two-Factor Authentication
          </p>
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-sm text-muted">
          Add an extra layer of security by requiring a one-time code from your authenticator app.
        </p>

        <div v-if="mfaStatus" class="flex items-center gap-2">
          <UIcon
            :name="mfaStatus.mfaEnabled ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
            :class="mfaStatus.mfaEnabled ? 'text-success' : 'text-muted'"
            class="size-5"
          />
          <span class="text-sm" :class="mfaStatus.mfaEnabled ? 'text-success' : 'text-muted'">
            {{ mfaStatus.mfaEnabled ? 'MFA is enabled' : 'MFA is not enabled' }}
          </span>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            v-if="!mfaStatus?.mfaEnabled"
            label="Enable MFA"
            @click="mfaSetupOpen = true"
          />
          <UButton
            v-else
            label="Disable MFA"
            color="error"
            variant="soft"
            @click="mfaDisableOpen = true"
          />
        </div>
      </template>
    </UCard>

    <UModal v-model:open="mfaSetupOpen" :close="false">
      <template #body>
        <div v-if="!mfaSetupSecret" class="max-w-sm mx-auto space-y-5 py-1">
          <h3 class="text-lg font-semibold text-center">
            Enable Two-Factor Authentication
          </h3>
          <p class="text-sm text-muted text-center">
            Enter your password to generate a security key
          </p>
          <UAlert v-if="mfaSetupForm.globalError" color="error" variant="soft" :title="mfaSetupForm.globalError" icon="i-lucide-alert-circle" />
          <UFormField name="password" label="Password" required>
            <UInput v-model="mfaSetupPassword" type="password" placeholder="Enter your password" class="w-full" />
          </UFormField>
        </div>

        <div v-else class="max-w-sm mx-auto space-y-5 py-1">
          <h3 class="text-lg font-semibold text-center">
            Scan QR Code
          </h3>
          <p class="text-sm text-muted text-center">
            Scan this code with your authenticator app, then enter the 6-digit code below
          </p>

          <div class="flex justify-center">
            <img v-if="mfaSetupQrDataUrl" :src="mfaSetupQrDataUrl" alt="QR Code" class="rounded-lg">
          </div>

          <div class="text-center">
            <p class="text-xs text-muted mb-1">
              Or enter this key manually:
            </p>
            <code class="text-xs bg-elevated px-2 py-1 rounded select-all font-mono">{{ mfaSetupSecret }}</code>
          </div>

          <UAlert v-if="mfaSetupForm.globalError" color="error" variant="soft" :title="mfaSetupForm.globalError" icon="i-lucide-alert-circle" />

          <UFormField name="code" label="Verification code" required>
            <UInput
              v-model="mfaVerifyCode"
              placeholder="000000"
              maxlength="6"
              class="w-full text-center text-xl tracking-widest"
              @keydown.enter="verifyMfa"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton v-if="!mfaSetupSecret" color="neutral" variant="soft" label="Cancel" @click="cancelMfaSetup" />
          <UButton v-if="!mfaSetupSecret" label="Generate key" @click="startMfaSetup" />
          <UButton v-if="mfaSetupSecret" color="neutral" variant="soft" label="Cancel" @click="cancelMfaSetup" />
          <UButton v-if="mfaSetupSecret" label="Verify & enable" :loading="mfaVerifyLoading" @click="verifyMfa" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="mfaDisableOpen" :close="false">
      <template #body>
        <div class="max-w-sm mx-auto space-y-5 py-1">
          <h3 class="text-lg font-semibold text-center">
            Disable Two-Factor Authentication
          </h3>
          <p class="text-sm text-muted text-center">
            Enter your password and an authentication code to confirm
          </p>
          <UAlert v-if="mfaDisableForm.globalError" color="error" variant="soft" :title="mfaDisableForm.globalError" icon="i-lucide-alert-circle" />
          <UFormField name="password" label="Password" required>
            <UInput v-model="mfaDisablePassword" type="password" placeholder="Enter your password" class="w-full" />
          </UFormField>
          <UFormField name="code" label="Authentication code" required>
            <UInput
              v-model="mfaDisableCode"
              placeholder="000000"
              maxlength="6"
              class="w-full text-center text-xl tracking-widest"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="soft" label="Cancel" @click="mfaDisableOpen = false; mfaDisablePassword = ''; mfaDisableCode = ''; mfaDisableForm.resetErrors()" />
          <UButton color="error" label="Disable MFA" :loading="mfaDisableLoading" @click="disableMfa" />
        </div>
      </template>
    </UModal>
  </div>
</template>
