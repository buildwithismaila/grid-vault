import { migrate } from 'drizzle-orm/postgres-js/migrator'

export default defineNitroPlugin(async () => {
  if (import.meta.dev)
    return
  // Vercel applies migrations via `drizzle-kit push` at build time
  // eslint-disable-next-line node/prefer-global/process
  if (process.env.VERCEL)
    return
  const db = useDb()
  await migrate(db, { migrationsFolder: 'server/db/migrations' })
})
