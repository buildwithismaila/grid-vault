<script setup lang="ts">
definePageMeta({ layout: 'auth' })
</script>

<template>
  <AuthPasswordSetForm
    endpoint="/api/auth/reset-password"
    title="Reset password"
    subtitle="Enter your new password"
    submit-label="Reset password"
    success-title="Password reset"
    success-description="Your password has been changed. You can now sign in."
  />
</template>
