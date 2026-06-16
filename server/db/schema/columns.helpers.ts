import { sql } from 'drizzle-orm'
import { timestamp, uuid } from 'drizzle-orm/pg-core'

export const timestamps = {
  createdAt: timestamp({ withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
}

/**
 * Soft-delete columns. No hard deletes on asset/substation records.
 */
export const softDelete = {
  deletedAt: timestamp({ withTimezone: true }),
  deletedBy: uuid(),
}
