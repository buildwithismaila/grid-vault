import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '../db/schema'

declare module 'nitropack' {
  interface NitroApp {
    db: PostgresJsDatabase<typeof schema>
  }
}
