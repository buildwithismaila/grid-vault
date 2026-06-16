import { inArray, sql } from 'drizzle-orm'
import { role, rolePermission, userRole } from '#server/db/schema/rbac'
import { user } from '#server/db/schema/user'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:read')

  const db = useDb()

  const roles = await db.select().from(role).orderBy(role.name)

  if (roles.length === 0)
    return roles

  const roleIds = roles.map(r => r.id)

  const [rps, urs, userRoleCounts] = await Promise.all([
    db
      .select()
      .from(rolePermission)
      .where(inArray(rolePermission.roleId, roleIds)),
    db
      .select({
        roleId: userRole.roleId,
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(userRole)
      .where(inArray(userRole.roleId, roleIds))
      .groupBy(userRole.roleId),
    db
      .select({
        roleName: user.role,
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(user)
      .groupBy(user.role),
  ])

  const permMap: Record<string, string[]> = {}
  for (const rp of rps) {
    (permMap[rp.roleId] ??= []).push(rp.permissionId)
  }

  const userCountMap: Record<string, number> = {}
  for (const ur of urs) {
    userCountMap[ur.roleId] = ur.count
  }

  const primaryCountMap: Record<string, number> = {}
  for (const uc of userRoleCounts) {
    primaryCountMap[uc.roleName] = uc.count
  }

  return roles.map(r => ({
    ...r,
    permissionIds: permMap[r.id] || [],
    userCount: (userCountMap[r.id] || 0) + (primaryCountMap[r.name] || 0),
  }))
})
