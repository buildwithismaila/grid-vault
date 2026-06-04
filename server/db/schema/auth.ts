import { relations } from 'drizzle-orm'
import { integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { user } from './user'

export const auth = pgTable('auth', {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid().references(() => user.id, { onDelete: 'cascade' }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  passwordHash: varchar({ length: 255 }).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
})

export const passwordResetToken = pgTable('password_reset_token', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(), // store hash, never raw token
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const authRelation = relations(auth, ({ one }) => ({
  user: one(user, {
    fields: [auth.userId],
    references: [user.id],
  }),
}))

export const passwordResetTokenRelation = relations(passwordResetToken, ({ many }) => ({
  user: many(user),
}))
