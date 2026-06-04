import { relations } from 'drizzle-orm'
import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { passwordResetToken } from './auth'
import { timestamps } from './columns.helpers'
import { jobRole, orgUnit } from './org'

export const roleEnum = pgEnum('role_enum', ['SUPERADMIN', 'ADMIN', 'REVIEWER', 'EDITOR', 'USER'])

export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'INACTIVE', 'PENDING'])

export const user = pgTable('user', {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }),
  payrollId: varchar({ length: 6 }).unique(),
  avatarUrl: varchar({ length: 255 }),
  role: roleEnum().notNull().default('USER'),
  status: userStatusEnum().notNull().default('PENDING'),
  locationId: uuid().references(() => orgUnit.id, { onDelete: 'set null' }),
  jobRoleId: uuid().references(() => jobRole.id, { onDelete: 'set null' }),
  ...timestamps,
})

export const userInvitation = pgTable('user_invitation', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  invitedByUserId: uuid('invited_by_user_id') // which admin sent the invite
    .notNull()
    .references(() => user.id, { onDelete: 'set null' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }), // null = pending
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const userRelations = relations(user, ({ one }) => ({
  location: one(orgUnit, {
    fields: [user.locationId],
    references: [orgUnit.id],
  }),
  jobRole: one(jobRole, {
    fields: [user.jobRoleId],
    references: [jobRole.id],
  }),
  invitation: one(userInvitation, {
    fields: [user.id],
    references: [userInvitation.userId],
  }),
  passwordResetToken: one(passwordResetToken, {
    fields: [user.id],
    references: [passwordResetToken.userId],
  }),
}))

export type User = typeof user.$inferSelect
export type NewUser = typeof user.$inferInsert
