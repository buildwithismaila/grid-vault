<script setup lang="ts">
import { formatEnum } from '#shared/utils'

interface UserProfile {
  id: string
  name: string | null
  payrollId: string | null
  avatarUrl: string | null
  role: string
  status: string
  email: string
  locationId: string | null
  locationName: string | null
  jobRoleId: string | null
  jobRoleName: string | null
}

const { user } = useUserSession()
const toast = useToast()

const { data: profile, refresh: refreshProfile } = useFetch<UserProfile>('/api/user/profile', { server: false })

const avatarFile = ref<File | null>(null)
const avatarPreview = ref('')
const uploading = ref(false)
const avatarInput = ref<HTMLInputElement>()

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return
  avatarFile.value = file
  const reader = new FileReader()
  reader.onload = () => {
    avatarPreview.value = reader.result as string
  }
  reader.readAsDataURL(file)
}

async function uploadAvatar() {
  if (!avatarFile.value)
    return
  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', avatarFile.value)
    const res = await $fetch<{ avatarUrl: string }>('/api/upload', { method: 'POST', body: form })
    if (user.value)
      user.value.avatarUrl = res.avatarUrl
    await refreshProfile()
    avatarFile.value = null
    avatarPreview.value = ''
    toast.add({ title: 'Avatar updated', color: 'success' })
  }
  catch {
    toast.add({ title: 'Failed to upload avatar', color: 'error' })
  }
  finally {
    uploading.value = false
  }
}

function clearAvatarSelection() {
  avatarFile.value = null
  avatarPreview.value = ''
}
</script>

<template>
  <div class="max-w-2xl space-y-6 pt-6">
    <UCard>
      <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div class="relative shrink-0">
          <UAvatar
            :src="profile?.avatarUrl || undefined"
            :alt="profile?.name || 'User'"
            size="3xl"
            icon="i-lucide-user"
          />
        </div>

        <div class="flex-1 text-center sm:text-left space-y-1">
          <h2 class="text-2xl font-bold">
            {{ profile?.name || 'User' }}
          </h2>
          <p class="text-muted">
            {{ profile?.email }}
          </p>
          <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <UBadge
              :label="profile?.role ?? ''"
              :color="profile?.role === 'Superadmin' ? 'warning' : profile?.role === 'Admin' ? 'info' : 'neutral'"
              variant="subtle"
            />
            <UBadge
              :label="formatEnum(profile?.status ?? '')"
              :color="profile?.status === 'ACTIVE' ? 'success' : profile?.status === 'PENDING' ? 'warning' : 'error'"
              variant="subtle"
            />
          </div>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <p class="font-semibold">
          Account Details
        </p>
      </template>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        <UFormField label="Payroll ID">
          <p class="text-sm font-mono">
            {{ profile?.payrollId || '—' }}
          </p>
        </UFormField>

        <UFormField label="Email">
          <p class="text-sm">
            {{ profile?.email }}
          </p>
        </UFormField>

        <UFormField label="Location">
          <p class="text-sm">
            {{ profile?.locationName || '—' }}
          </p>
        </UFormField>

        <UFormField label="Job Role">
          <p class="text-sm">
            {{ profile?.jobRoleName || '—' }}
          </p>
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <p class="font-semibold">
          Avatar
        </p>
      </template>

      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <UAvatar
            :src="avatarPreview || profile?.avatarUrl || undefined"
            :alt="profile?.name || 'User'"
            size="lg"
            icon="i-lucide-user"
          />
          <div class="flex-1">
            <p class="text-sm font-medium">
              Profile picture
            </p>
            <p class="text-xs text-muted">
              JPEG, PNG, GIF or WebP up to 2MB
            </p>
          </div>
          <UButton
            label="Choose file"
            color="neutral"
            variant="outline"
            @click="avatarInput?.click()"
          />
          <input
            ref="avatarInput"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            class="hidden"
            @change="handleFileSelect"
          >
        </div>

        <div v-if="avatarFile" class="flex items-center justify-between pl-14">
          <p class="text-sm text-muted truncate max-w-xs">
            {{ avatarFile.name }}
          </p>
          <div class="flex gap-2">
            <UButton label="Cancel" color="neutral" variant="ghost" size="sm" @click="clearAvatarSelection" />
            <UButton label="Upload" :loading="uploading" size="sm" @click="uploadAvatar" />
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
