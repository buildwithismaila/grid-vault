import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { permission, role, rolePermission, userRole } from '#server/db/schema/rbac'

const SUPERADMIN_ROLE = 'Superadmin'

/**
 * Fetch all permission names granted to a user via their roles.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const db = useDb()

  const rows = await db
    .select({ name: permission.name })
    .from(userRole)
    .innerJoin(role, eq(userRole.roleId, role.id))
    .innerJoin(rolePermission, eq(rolePermission.roleId, role.id))
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(eq(userRole.userId, userId))

  return rows.map(r => r.name)
}

/**
 * Check if the authenticated user has a given permission.
 * SUPERADMIN bypasses all checks.
 */
export async function hasPermission(event: H3Event, perm: string): Promise<boolean> {
  const user = event.context.user
  if (!user)
    return false
  if (user.role === SUPERADMIN_ROLE)
    return true

  // Use cached permissions from middleware if available
  if (event.context.permissions) {
    return event.context.permissions.includes(perm)
  }

  const perms = await getUserPermissions(user.id)
  event.context.permissions = perms
  return perms.includes(perm)
}

/**
 * Require a permission � throws 403 Forbidden if not granted.
 */
export async function requirePermission(event: H3Event, perm: string): Promise<void> {
  const allowed = await hasPermission(event, perm)
  if (!allowed) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: `Missing required permission: ${perm}`,
    })
  }
}

/**
 * Require the user to have ANY of the given permissions.
 */
export async function requireAnyPermission(event: H3Event, perms: string[]): Promise<void> {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  if (user.role === SUPERADMIN_ROLE)
    return

  if (!event.context.permissions) {
    event.context.permissions = await getUserPermissions(user.id)
  }

  const hasAny = perms.some(p => event.context.permissions.includes(p))
  if (!hasAny) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Missing required permissions',
    })
  }
}
