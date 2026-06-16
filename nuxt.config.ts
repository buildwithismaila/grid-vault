/* eslint-disable node/prefer-global/process */
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  typescript: {
    strict: true,
  },
  devtools: { enabled: true },
  modules: [
    '@nuxt/eslint',
    'nuxt-auth-utils',
    '@nuxt/ui',
    'nuxt-resend',
  ],
  eslint: {
    config: {
      standalone: false,
    },
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    postgresUrl: process.env.NUXT_POSTGRES_URL,
    sessionPassword: process.env.NUXT_SESSION_PASSWORD,
    initialEmail: '',
    initialPassword: '',
    appUrl: process.env.NUXT_APP_URL || 'http://localhost:3000',
    emailFrom: process.env.NUXT_EMAIL_FROM || 'Grid Vault <onboarding@resend.dev>',
  },
  resend: {
    apiKey: process.env.NUXT_RESEND_API_KEY,
  },
  nitro: {
    serverAssets: [{
      baseName: 'migrations',
      dir: 'server/db/migrations',
    }],
  },
  vite: {
    optimizeDeps: {
      include: [
        '@tanstack/vue-table',
        'qrcode',
        'zod',
      ],
    },
  },
})
