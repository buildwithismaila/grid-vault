import { sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'

const MIGRATIONS_SCHEMA = 'drizzle'
const MIGRATIONS_TABLE = '__drizzle_migrations'

interface JournalEntry {
  idx: number
  version: string
  when: number
  tag: string
  breakpoints: boolean
}

interface Journal {
  version: string
  dialect: string
  entries: JournalEntry[]
}

export async function runMigrations(db: PostgresJsDatabase<Record<string, unknown>>) {
  const storage = useStorage('assets:migrations')

  let journalRaw: unknown
  try {
    journalRaw = await storage.getItem('meta/_journal.json')
  }
  catch {
    return
  }

  if (!journalRaw)
    return

  const raw = typeof journalRaw === 'string' ? journalRaw : Buffer.from(journalRaw as Uint8Array).toString('utf-8')
  const journal: Journal = JSON.parse(raw)

  await db.session.execute(sql`
    CREATE SCHEMA IF NOT EXISTS ${sql.identifier(MIGRATIONS_SCHEMA)}
  `)

  await db.session.execute(sql`
    CREATE TABLE IF NOT EXISTS ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)} (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `)

  const dbMigrations = await db.session.all<{ id: number, hash: string, created_at: number }>(
    sql`select id, hash, created_at from ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)} order by created_at desc limit 1`,
  )
  const lastDbMigration = dbMigrations[0]

  await db.session.transaction(async (tx) => {
    for (const entry of journal.entries) {
      if (lastDbMigration && Number(lastDbMigration.created_at) >= entry.when)
        continue

      const sqlRaw = await storage.getItem(`${entry.tag}.sql`)
      if (!sqlRaw)
        continue

      const fullSql = typeof sqlRaw === 'string' ? sqlRaw : Buffer.from(sqlRaw as Uint8Array).toString('utf-8')

      const statements = fullSql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)

      for (const stmt of statements) {
        await tx.execute(sql.raw(stmt))
      }

      const hash = crypto.createHash('sha256').update(fullSql).digest('hex')

      await tx.execute(
        sql`insert into ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)} ("hash", "created_at") values(${hash}, ${entry.when})`,
      )
    }
  })
}
