import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from './columns.helpers'

export const orgUnit = pgTable('org_unit', {
  id: uuid().primaryKey().defaultRandom().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(),
  type: varchar({ length: 50, enum: ['HQ', 'REGION', 'AREA_OFFICE', 'SERVICE_CENTER'] }).notNull(),
  parentId: uuid().references((): AnyPgColumn => orgUnit.id, { onDelete: 'set null' }),
  ...timestamps,
})

export const jobRole = pgTable('job_role', {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull().unique(),
  description: varchar({ length: 255 }),
  ...timestamps,
})

export const orgUnitRelation = relations(orgUnit, ({ one }) => ({
  parent: one(orgUnit, {
    fields: [orgUnit.parentId],
    references: [orgUnit.id],
  }),
}))
