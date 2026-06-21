import { index, jsonb, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core'
import { user } from './user'
import { timestamps } from './columns.helpers'

export const auditLog = pgTable('security_audit_log', {
  id: uuid().primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => user.id, { onDelete: 'set null' }),
  actorEmail: varchar('actor_email', { length: 255 }),
  action: varchar({ length: 50 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId: varchar('resource_id', { length: 255 }),
  targetUserId: uuid('target_user_id'),
  details: jsonb(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  outcome: varchar({ length: 10 }).notNull().default('SUCCESS'),
  createdAt: timestamps.createdAt,
}, t => [
  index('audit_log_action_idx').on(t.action),
  index('audit_log_actor_id_idx').on(t.actorId),
  index('audit_log_target_user_id_idx').on(t.targetUserId),
  index('audit_log_created_at_idx').on(t.createdAt),
])

export type AuditLog = typeof auditLog.$inferSelect
export type NewAuditLog = typeof auditLog.$inferInsert
