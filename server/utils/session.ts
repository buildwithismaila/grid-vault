import { eq } from 'drizzle-orm'
import { role, userRole } from '#server/db/schema/rbac'

export async function buildSessionUserFromRow(row: { auth: { email: string, userId: string }, user: { id: string, payrollId: string | null, name: string | null, avatarUrl: string | null, role: string, locationId: string | null } }) {
  let permissions: string[] = []
  let roles: string[] = []

  if (row.user.role !== 'Superadmin') {
    const db = useDb()
    const userRoles = await db
      .select({ name: role.name })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(eq(userRole.userId, row.user.id))

    roles = userRoles.map(r => r.name)
    permissions = await getUserPermissions(row.user.id)
  }

  return {
    id: row.user.id,
    payrollId: row.user.payrollId ?? '',
    email: row.auth.email,
    name: row.user.name ?? '',
    avatarUrl: row.user.avatarUrl ?? '',
    role: row.user.role,
    locationId: row.user.locationId ?? '',
    permissions,
    roles,
  }
}
