import { and, count, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { auth } from '#server/db/schema/auth'
import { jobRole, orgUnit } from '#server/db/schema/org'
import { role, userRole } from '#server/db/schema/rbac'
import { user, userInvitation } from '#server/db/schema/user'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:read')

  const query = getQuery(event)
  const search = (query.search as string) || ''
  const status = (query.status as string) || 'all'
  const page = Math.max(1, Number.parseInt((query.page as string) || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt((query.limit as string) || '15', 10) || 15))
  const offset = (page - 1) * limit

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

  // Get total count matching filters
  const [totalResult] = await db
    .select({ count: count() })
    .from(user)
    .leftJoin(auth, eq(auth.userId, user.id))
    .leftJoin(userInvitation, eq(userInvitation.userId, user.id))
    .where(where)

  const total = totalResult?.count ?? 0

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
    .limit(limit)
    .offset(offset)

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

  // Compute status counts from total matching, not from paginated page
  const [counts] = await db
    .select({
      total: count(),
      activeCount: sql<number>`count(*) FILTER (WHERE ${user.status} = 'ACTIVE')`,
      pendingCount: sql<number>`count(*) FILTER (WHERE ${user.status} = 'PENDING')`,
      disabledCount: sql<number>`count(*) FILTER (WHERE ${user.status} = 'INACTIVE')`,
    })
    .from(user)

  return {
    data: rows.map(u => ({
      ...u,
      customRoles: (userRolesMap[u.id] || []).filter(name => name !== u.role),
    })),
    total,
    activeCount: counts?.activeCount ?? 0,
    pendingCount: counts?.pendingCount ?? 0,
    disabledCount: counts?.disabledCount ?? 0,
    page,
    limit,
  }
})
