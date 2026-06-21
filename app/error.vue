<script setup lang="ts">
const props = defineProps<{
  error: { statusCode: number, statusMessage: string, message: string, url: string }
}>()

const heading = computed(() => {
  if (props.error.statusCode === 403)
    return 'Access Denied'
  if (props.error.statusCode === 404)
    return 'Page Not Found'
  if (props.error.statusCode === 429)
    return 'Too Many Requests'
  return 'Something went wrong'
})

const description = computed(() => {
  if (props.error.statusCode === 403)
    return 'You do not have permission to access this page.'
  if (props.error.statusCode === 404)
    return 'The page you are looking for does not exist or has been moved.'
  if (props.error.statusCode === 429)
    return 'Please wait a moment before trying again.'
  return props.error.statusMessage || 'An unexpected error occurred.'
})

const icon = computed(() => {
  if (props.error.statusCode === 403)
    return 'i-lucide-shield-alert'
  if (props.error.statusCode === 404)
    return 'i-lucide-search-x'
  if (props.error.statusCode === 429)
    return 'i-lucide-hourglass'
  return 'i-lucide-alert-triangle'
})

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <UApp>
    <div class="flex items-center justify-center min-h-screen px-4">
      <div class="text-center max-w-sm">
        <UIcon :name="icon" class="size-12 text-muted mx-auto mb-4" />
        <h1 class="text-2xl font-bold mb-2">
          {{ heading }}
        </h1>
        <p class="text-sm text-muted mb-6">
          {{ description }}
        </p>
        <UButton label="Back to home" @click="goHome" />
      </div>
    </div>
  </UApp>
</template>
