// @ts-check
import antfu from '@antfu/eslint-config'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  antfu({
    type: 'app',
    typescript: true,
    vue: true,
    formatters: true,
    ignores: ['.pnpm-store/**', 'pnpm-lock.yaml', '.husky/**', '.nuxt/**', '**/migrations/*', 'components/ui/*', 'public/*'],
    rules: {},
  }),
)
