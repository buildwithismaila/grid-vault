<script setup lang="ts">
const props = defineProps<{
  password: string
}>()

const MAX_SCORE = 8

const strength = computed(() => {
  const pw = props.password
  if (!pw)
    return null
  let score = 0
  if (pw.length >= 8)
    score++
  if (pw.length >= 12)
    score++
  if (pw.length >= 16)
    score++
  if (/[a-z]/.test(pw))
    score++
  if (/[A-Z]/.test(pw))
    score++
  if (/\d/.test(pw))
    score++
  if (/[^a-z0-9]/i.test(pw))
    score++

  let level: string
  let color: 'error' | 'warning' | 'info' | 'success'
  if (score <= 2) {
    level = 'Weak'
    color = 'error'
  }
  else if (score <= 4) {
    level = 'Fair'
    color = 'warning'
  }
  else if (score <= 6) {
    level = 'Good'
    color = 'info'
  }
  else {
    level = 'Strong'
    color = 'success'
  }

  const displayScore = level === 'Strong' ? MAX_SCORE : score
  return { score, displayScore, level, color, maxScore: MAX_SCORE }
})
</script>

<template>
  <div v-if="password && strength" class="mt-1.5 space-y-0.5">
    <UProgress
      :model-value="strength.displayScore"
      :max="strength.maxScore"
      :color="strength.color"
      size="xs"
    />
    <p class="text-xs" :class="`text-${strength.color}`">
      Password strength: {{ strength.level }}
    </p>
  </div>
</template>
