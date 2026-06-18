import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { auth } from '#server/db/schema/auth'
import { jobRole, orgUnit } from '#server/db/schema/org'
import { role, userRole } from '#server/db/schema/rbac'
import { user, userInvitation } from '#server/db/schema/user'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:read')

  const query = getQuery(event)
  const search = (query.search as string) || ''
  const status = (query.status as string) || 'all'

  const db = useDb()

  const conditions = []

  if (status !== 'all') {
    const statusMap: Record<string, string> = {
      active: 'ACTIVE',
      pending: 'PENDING',
      disabled: 'INACTIVE',
    }
    conditions.push(eq(user.status, statusMap[status] || status.toUpperCase()))
  }

  if (search) {
    conditions.push(
      or(
        ilike(user.name, `%${search}%`),
        ilike(auth.email, `%${search}%`),
        ilike(userInvitation.email, `%${search}%`),
      ),
    )
  }

  const inviterAlias = db.select({
    id: user.id,
    name: user.name,
  }).from(user).as('inviter')

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      payrollId: user.payrollId,
      email: sql<string>`COALESCE(${userInvitation.email}, ${auth.email})`,
      role: user.role,
      status: user.status,
      locationId: user.locationId,
      locationName: orgUnit.name,
      jobRoleId: user.jobRoleId,
      jobRoleName: jobRole.name,
      createdAt: user.createdAt,
      inviteId: userInvitation.id,
      inviteExpiresAt: userInvitation.expiresAt,
      inviteCreatedAt: userInvitation.createdAt,
      invitedByName: inviterAlias.name,
    })
    .from(user)
    .leftJoin(auth, eq(auth.userId, user.id))
    .leftJoin(orgUnit, eq(user.locationId, orgUnit.id))
    .leftJoin(jobRole, eq(user.jobRoleId, jobRole.id))
    .leftJoin(userInvitation, eq(userInvitation.userId, user.id))
    .leftJoin(inviterAlias, eq(userInvitation.invitedByUserId, inviterAlias.id))
    .where(where)
    .orderBy(user.createdAt)

  const userIds = rows.map(u => u.id)
  const userRoleRows: { userId: string, roleName: string }[] = []
  if (userIds.length > 0) {
    userRoleRows.push(...await db
      .select({
        userId: userRole.userId,
        roleName: role.name,
      })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(inArray(userRole.userId, userIds)),
    )
  }

  const userRolesMap: Record<string, string[]> = {}
  for (const ur of userRoleRows) {
    (userRolesMap[ur.userId] ??= []).push(ur.roleName)
  }

  return rows.map(u => ({
    ...u,
    customRoles: (userRolesMap[u.id] || []).filter(name => name !== u.role),
  }))
})
