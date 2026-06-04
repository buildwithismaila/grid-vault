import { migrate } from 'drizzle-orm/postgres-js/migrator'

export default defineNitroPlugin(async () => {
  if (import.meta.dev)
    return
  const db = useDb()
  await migrate(db, { migrationsFolder: 'server/db/migrations' })
})
