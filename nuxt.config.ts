// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  typescript: {
    strict: true,
  },
  devtools: { enabled: true },
  modules: ['@nuxt/eslint'],
  eslint: {
    config: {
      standalone: false,
    },
  },
})
