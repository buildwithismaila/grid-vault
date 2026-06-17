import { relations } from 'drizzle-orm'
import { boolean, index, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from './columns.helpers'
import { user } from './user'

export const permission = pgTable('permission', {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar({ length: 100 }).notNull().unique(),
  description: varchar({ length: 255 }),
  resource: varchar({ length: 50 }).notNull(),
  action: varchar({ length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const role = pgTable('role', {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar({ length: 100 }).notNull().unique(),
  description: varchar({ length: 255 }),
  isSystem: boolean('is_system').notNull().default(false),
  ...timestamps,
})

export const rolePermission = pgTable('role_permission', {
  id: uuid().defaultRandom().primaryKey(),
  roleId: uuid()
    .notNull()
    .references(() => role.id, { onDelete: 'cascade' }),
  permissionId: uuid()
    .notNull()
    .references(() => permission.id, { onDelete: 'cascade' }),
}, t => [
  unique().on(t.roleId, t.permissionId),
  index('role_permission_role_id_idx').on(t.roleId),
])

export const userRole = pgTable('user_role', {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  roleId: uuid()
    .notNull()
    .references(() => role.id, { onDelete: 'cascade' }),
}, t => [
  unique().on(t.userId, t.roleId),
  index('user_role_user_id_idx').on(t.userId),
])

export const permissionRelations = relations(permission, ({ many }) => ({
  rolePermissions: many(rolePermission),
}))

export const roleRelations = relations(role, ({ many }) => ({
  rolePermissions: many(rolePermission),
  userRoles: many(userRole),
}))

export const rolePermissionRelations = relations(rolePermission, ({ one }) => ({
  role: one(role, {
    fields: [rolePermission.roleId],
    references: [role.id],
  }),
  permission: one(permission, {
    fields: [rolePermission.permissionId],
    references: [permission.id],
  }),
}))

export const userRoleRelations = relations(userRole, ({ one }) => ({
  user: one(user, {
    fields: [userRole.userId],
    references: [user.id],
  }),
  role: one(role, {
    fields: [userRole.roleId],
    references: [role.id],
  }),
}))

export type Permission = typeof permission.$inferSelect
export type NewPermission = typeof permission.$inferInsert
export type Role = typeof role.$inferSelect
export type NewRole = typeof role.$inferInsert
export type RolePermission = typeof rolePermission.$inferSelect
export type NewRolePermission = typeof rolePermission.$inferInsert
export type UserRole = typeof userRole.$inferSelect
export type NewUserRole = typeof userRole.$inferInsert
