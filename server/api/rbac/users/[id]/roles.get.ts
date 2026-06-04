import { eq } from 'drizzle-orm'
import { role, userRole } from '#server/db/schema/rbac'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user:read')
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Missing user id' })

  const db = useDb()

  const rows = await db
    .select({
      id: userRole.id,
      roleId: userRole.roleId,
      roleName: role.name,
    })
    .from(userRole)
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(eq(userRole.userId, id))

  return rows
})
