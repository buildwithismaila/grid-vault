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
  ],
  eslint: {
    config: {
      standalone: false,
    },
  },
  runtimeConfig: {
    postgresUrl: process.env.NUXT_POSTGRES_URL,
    sessionPassword: process.env.NUXT_SESSION_PASSWORD,
    initialEmail: '',
    initialPassword: '',
  },
})
