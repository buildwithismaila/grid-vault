<script setup lang="ts">
definePageMeta({ layout: 'auth' })
</script>

<template>
  <AuthPasswordSetForm
    endpoint="/api/auth/accept-invite"
    title="Accept invitation"
    subtitle="Set your password to activate your account"
    submit-label="Activate account"
    success-title="Account activated"
    success-description="You can now sign in with your credentials."
  />
</template>
