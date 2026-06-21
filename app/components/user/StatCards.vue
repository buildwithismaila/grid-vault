<script setup lang="ts">
defineProps<{
  total: number
  active: number
  pending: number
  disabled: number
}>()
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
    <UCard variant="subtle" class="relative overflow-hidden">
      <div class="flex items-center gap-3">
        <div class="shrink-0 rounded-full bg-info/10 p-2.5">
          <UIcon name="i-lucide-users" class="size-5 text-info" />
        </div>
        <div>
          <p class="text-lg font-bold">
            {{ total }}
          </p>
          <p class="text-xs text-muted">
            Total
          </p>
        </div>
      </div>
    </UCard>
    <UCard variant="subtle" class="relative overflow-hidden">
      <div class="flex items-center gap-3">
        <div class="shrink-0 rounded-full bg-success/10 p-2.5">
          <UIcon name="i-lucide-check-circle" class="size-5 text-success" />
        </div>
        <div>
          <p class="text-lg font-bold">
            {{ active }}
          </p>
          <p class="text-xs text-muted">
            Active
          </p>
        </div>
      </div>
    </UCard>
    <UCard variant="subtle" class="relative overflow-hidden">
      <div class="flex items-center gap-3">
        <div class="shrink-0 rounded-full bg-warning/10 p-2.5">
          <UIcon name="i-lucide-clock" class="size-5 text-warning" />
        </div>
        <div>
          <p class="text-lg font-bold">
            {{ pending }}
          </p>
          <p class="text-xs text-muted">
            Pending
          </p>
        </div>
      </div>
    </UCard>
    <UCard variant="subtle" class="relative overflow-hidden">
      <div class="flex items-center gap-3">
        <div class="shrink-0 rounded-full bg-error/10 p-2.5">
          <UIcon name="i-lucide-pause-circle" class="size-5 text-error" />
        </div>
        <div>
          <p class="text-lg font-bold">
            {{ disabled }}
          </p>
          <p class="text-xs text-muted">
            Disabled
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
