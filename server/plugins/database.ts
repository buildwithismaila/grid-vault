import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from '../db/schema'

export default defineNitroPlugin((nitroApp) => {
  const { postgresUrl } = useRuntimeConfig()

  if (!postgresUrl) {
    throw new Error('POSTGRES_URL is not defined')
  }

  const client = postgres(postgresUrl, { max: 10 })
  const db = drizzle(client, { schema, casing: 'snake_case' })

  nitroApp.db = db

  nitroApp.hooks.hook('close', async () => {
    await client.end()
  })
})
