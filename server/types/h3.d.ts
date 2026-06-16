import type { User } from '#auth-utils'

declare module 'h3' {
  interface H3EventContext {
    user: User | null
    permissions?: string[]
  }
}

export { }
